"""
The processing steps for ingesting wikipedia articles are in this module.

The processing/__init__.py file joins these functions together into a pipeline.
"""
import hashlib
import json
import logging
from datetime import datetime

from langchain.text_splitter import RecursiveCharacterTextSplitter

import wikichat.utils
from wikichat.database import EMBEDDINGS_COLLECTION, METADATA_COLLECTION, SUGGESTIONS_COLLECTION
from wikichat.processing import embeddings, wikipedia
from wikichat.processing.model import ArticleMetadata, Article, ChunkedArticle, Chunk, ChunkMetadata, \
    ChunkedArticleDiff, \
    ChunkedArticleMetadataOnly, VectoredChunkedArticleDiff, VectoredChunk, EmbeddingDocument, RECENT_ARTICLES, \
    RecentArticles
from wikichat.utils.metrics import METRICS
from wikichat.utils.pipeline import AsyncPipeline

TEXT_SPLITTER = RecursiveCharacterTextSplitter(chunk_size=1024, chunk_overlap=200, length_function=len)


# ======================================================================================================================
# Processing Pipeline Functions
# ======================================================================================================================

async def load_article(meta: ArticleMetadata) -> Article:
    """Loads the article content from the URL and cleans it up"""
    return await wikipedia.scrape_article(meta)


async def chunk_article(article: Article) -> ChunkedArticle:
    chunks = TEXT_SPLITTER.split_text(article.content)
    logging.debug(f"Split article {article.metadata.url} into {len(chunks)} chunks")

    hashes = [
        hashlib.sha256(chunk.encode('utf-8')).hexdigest()
        for chunk in chunks
    ]
    await METRICS.update_chunks(chunks_created=len(chunks))

    return ChunkedArticle(
        article=article,
        chunks=[
            Chunk(content=chunk, metadata=ChunkMetadata(index=idx, length=len(chunk), hash=chunk_hash))
            for idx, (chunk, chunk_hash) in enumerate(zip(chunks, hashes))
        ]
    )


async def calc_chunk_diff(chunked_article: ChunkedArticle) -> ChunkedArticleDiff:
    """
    Work out what chunks for this article are new or deleted, this is based on the chunk hash not the index
    There are no modified chunks, a modified chunk is both a deleted and a new chunk

    """

    new_metadata: ChunkedArticleMetadataOnly = ChunkedArticleMetadataOnly.from_chunked_article(chunked_article)

    logging.debug(f"Calculating chunk delta for article {chunked_article.article.metadata.url}")
    # get the existing chunks from the db
    resp = await wikichat.utils.wrap_blocking_io(
        lambda x: METADATA_COLLECTION.find_one(filter={"_id": x}),
        new_metadata._id
    )
    prev_metadata_doc = resp["data"]["document"]

    if not prev_metadata_doc:
        logging.debug(f"No previous metadata, all chunks are new")
        await METRICS.update_chunks(chunk_diff_new=len(chunked_article.chunks))
        return ChunkedArticleDiff(
            chunked_article=chunked_article,
            new_chunks=chunked_article.chunks
        )
    # We found existing article metadata, see if anything has changed
    await METRICS.update_database(articles_read=1)
    prev_metadata: ChunkedArticleMetadataOnly = ChunkedArticleMetadataOnly.from_dict(prev_metadata_doc)

    logging.debug(f"Found previous metadata with {len(prev_metadata.chunks_metadata)} chunks, comparing")

    # we compare chunks using the hash, not the index
    new_chunks: list[Chunk] = [
        chunk
        for chunk in chunked_article.chunks
        if chunk.metadata.hash not in prev_metadata.chunks_metadata.keys()
    ]
    # Can only record metadata for the deleted chunks (not the chunks) because we only store metadata about the chunks
    deleted_chunks: list[ChunkMetadata] = [
        chunk_meta
        for chunk_meta in prev_metadata.chunks_metadata.values()
        if chunk_meta.hash not in new_metadata.chunks_metadata.keys()
    ]
    unchanged_chunks: list[Chunk] = [
        chunk
        for chunk in chunked_article.chunks
        if chunk.metadata.hash in prev_metadata.chunks_metadata.keys()
    ]
    await METRICS.update_chunks(chunk_diff_new=len(new_chunks), chunk_diff_deleted=len(deleted_chunks),
                                chunk_diff_unchanged=len(unchanged_chunks))
    logging.debug(
        f"Found {len(new_chunks)} new chunks, {len(deleted_chunks)} deleted chunks and {len(unchanged_chunks)} unchanged chunks")

    return ChunkedArticleDiff(
        chunked_article=chunked_article,
        new_chunks=new_chunks,
        deleted_chunks=deleted_chunks,
        unchanged_chunks=unchanged_chunks)


async def vectorize_diff(article_diff: ChunkedArticleDiff) -> VectoredChunkedArticleDiff | None:
    """Calc the vectors for all the chunks we want to store in the db"""

    logging.debug(f"Getting embeddings for article {article_diff.chunked_article.article.metadata.url} "
                  "which has {len(article_diff.new_chunks)} new chunks")

    vectors = await embeddings.get_embeddings([chunk.content for chunk in article_diff.new_chunks])
    await METRICS.update_chunks(chunks_vectorized=len(vectors))

    # We can get vectors with all zeros, this could be because overloaded or objectionable content
    # this will be rare, so count the non zero vectors and if we have any zero vectors skip the article
    non_zero_vectors = list(vector for vector in vectors if any(x != 0 for x in vector))
    zero_vector_count = len(vectors) > len(non_zero_vectors)
    if zero_vector_count:
        logging.debug(
            f"Skipping article {article_diff.chunked_article.article.metadata.url} cohere returned {zero_vector_count} zero vectors")
        for i in range(len(vectors)):
            if all([x == 0 for x in vectors[i]]):
                logging.debug(
                    f"Zero vector for chunk in {article_diff.chunked_article.article.metadata.url} content= {article_diff.new_chunks[i].content}")
        await METRICS.update_article(zero_vectors=1)
        return None

    return VectoredChunkedArticleDiff(
        chunked_article=article_diff.chunked_article,
        new_chunks=[
            VectoredChunk(vector=vector, chunked_article=article_diff.chunked_article, chunk=chunk)
            for vector, chunk, in zip(vectors, article_diff.new_chunks, )
        ],
        deleted_chunks=article_diff.deleted_chunks
    )


async def store_article_diff(article_diff: VectoredChunkedArticleDiff) -> VectoredChunkedArticleDiff:
    # HACK - update the meta data first, if there is an error we will fail before we insert the chunks
    # this is not ideal, but I think it will reduce the amount of chunk collisions under load
    await update_article_metadata(article_diff)
    await insert_vectored_chunks(article_diff.new_chunks)
    await delete_vectored_chunks(article_diff.deleted_chunks)

    return article_diff


async def insert_vectored_chunks(vectored_chunks: list[VectoredChunk]) -> None:
    # special logger to catch any places where we try to overwrite an existing chunk in the db
    existing_chunk_logger = logging.getLogger('existing_chunks')

    batch_size = 20
    logging.debug(f"Starting inserting {len(vectored_chunks)} vectored chunks into db using batches of {batch_size}")

    start_all = datetime.now()
    batch: list[VectoredChunk]
    for batch_count, batch in wikichat.utils.batch_list(vectored_chunks, batch_size, enumerate_batches=True):
        start_batch = datetime.now()
        article_embeddings: list[EmbeddingDocument] = list(map(EmbeddingDocument.from_vectored_chunk, batch))

        # use options.ordered = false so documents can be inserted in parallel
        logging.debug(f"Inserting batch number {batch_count} with size {len(batch)}")
        resp = await wikichat.utils.wrap_blocking_io(
            lambda x: EMBEDDINGS_COLLECTION.insert_many(
                documents=x,
                options={"ordered": False},
                partial_failures_allowed=True
            ),
            [article_embedding.to_dict() for article_embedding in article_embeddings]
        )

        # We are OK with DOCUMENT_ALREADY_EXISTS errors
        errors = resp.get("errors", [])
        exists_errors = [error for error in errors if error.get("errorCode") == "DOCUMENT_ALREADY_EXISTS"]
        if exists_errors:
            logging.debug(
                f"Got {len(exists_errors)} DOCUMENT_ALREADY_EXISTS errors, ignoring. Chunks {exists_errors}")
            await METRICS.update_database(chunk_collision=len(exists_errors))

            inserted_ids = {doc_id for doc_id in resp["status"]["insertedIds"]}
            for article_embedding in article_embeddings:
                if article_embedding._id not in inserted_ids:
                    # remove the vector, it will be too big to log
                    doc = article_embedding.to_dict()
                    doc.pop("$vector", None)
                    existing_chunk_logger.warning(doc)

        if len(errors) != len(exists_errors):
            logging.error(f"Got non DOCUMENT_ALREADY_EXISTS errors, stopping: {errors}")
            raise ValueError(json.dumps(errors))

        logging.debug(f"Finished inserting batch number {batch_count} duration {datetime.now() - start_batch}")

    await METRICS.update_database(chunks_inserted=len(vectored_chunks))
    logging.debug(
        f"Finished inserting {len(vectored_chunks)} article embeddings, total duration {datetime.now() - start_all}")


async def delete_vectored_chunks(chunks: list[ChunkMetadata]) -> None:
    batch_size = 20
    logging.debug(f"Starting deleting {len(chunks)} article embedding chunks into db using batches of {batch_size}")

    start_all = datetime.now()
    for batch_count, batch in wikichat.utils.batch_list(chunks, batch_size, enumerate_batches=True):
        start_batch = datetime.now()
        logging.debug(f"Deleting batch number {batch_count} with size {len(batch)}")
        resp = await wikichat.utils.wrap_blocking_io(
            lambda x: EMBEDDINGS_COLLECTION.delete_many(
                filter={
                    "_id": {"$in": x}
                }
            ),
            [chunk.hash for chunk in batch]
        )
        logging.debug(f"Finished deleting batch number {batch_count} duration {datetime.now() - start_batch}")
    await METRICS.update_database(chunks_deleted=len(chunks))
    logging.debug(
        f"Finished deleting {len(chunks)} article embeddings total duration {datetime.now() - start_all}")


async def update_article_metadata(vectored_diff: VectoredChunkedArticleDiff) -> None:
    new_metadata: ChunkedArticleMetadataOnly = ChunkedArticleMetadataOnly.from_vectored_diff(vectored_diff)
    logging.debug(
        f"Updating article metadata for article url {new_metadata.article_metadata.url}")

    await wikichat.utils.wrap_blocking_io(
        lambda x: METADATA_COLLECTION.find_one_and_replace(
            filter={"_id": x._id},
            replacement=x.to_dict(),
            options={"upsert": True}
        ),
        new_metadata
    )

    # TODO COmment
    recent_articles: RecentArticles = await RECENT_ARTICLES.update_and_clone(new_metadata)
    await wikichat.utils.wrap_blocking_io(
        lambda x: SUGGESTIONS_COLLECTION.find_one_and_replace(
            filter={"_id": x._id},
            replacement=x.to_dict(),
            options={"upsert": True}
        ),
        recent_articles
    )
    await METRICS.update_database(articles_inserted=1)
    await METRICS.update_article(recent_url=new_metadata.article_metadata.url)


async def process_article_metadata(pipeline: AsyncPipeline, article_metadata: list[ArticleMetadata]) -> bool:
    """Process the article metadata into the DB

    NOTE: You should only call this when doing the base load, call maybe_process_article_metadata when listening
    for changes.
    """

    for metadata in article_metadata:
        if not await pipeline.put_to_first_step(metadata):
            logging.info(f"Reached max number of items to process ({pipeline.max_items}), stopping.")
            return False
    return True
