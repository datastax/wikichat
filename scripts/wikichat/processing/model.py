"""
This file contains the dataclasses used to process the articles and the classes we store in Astra.

These should be plain data classes, and should not import other parts of the wikichat application.
"""
import asyncio
from dataclasses import dataclass, field, replace

from dataclasses_json import config, dataclass_json


# ======================================================================================================================
# Data objects we user for processing the articles
# ======================================================================================================================

@dataclass
class ArticleMetadata:
    """Metadata about an article we may want to process"""
    url: str
    title: str = None


@dataclass
class Article:
    """An article we are going to process, has the metadata and the content scrapped from the source"""
    metadata: ArticleMetadata
    content: str = None


@dataclass
class ChunkMetadata:
    """Metadata about a chunk of the article content, used to identify the chunk and to compare it with other chunks"""
    index: int
    length: int
    hash: str


@dataclass
class Chunk:
    """A chunk of the article content, we vectorize the chunks"""
    content: str
    metadata: ChunkMetadata


@dataclass
class ChunkedArticle:
    """An article that has been chunked, we can vectorize the chunks"""
    article: Article
    chunks: list[Chunk] = field(default_factory=list)


@dataclass
class ChunkedArticleDiff:
    """For this chunked article, how is it different to the last time we saw it ? """
    chunked_article: ChunkedArticle
    new_chunks: list[Chunk] = field(default_factory=list)
    deleted_chunks: list[ChunkMetadata] = field(default_factory=list)
    unchanged_chunks: list[Chunk] = field(default_factory=list)


@dataclass
class VectoredChunk:
    """A chunk that has been vectorized"""
    vector: list[float]
    chunked_article: ChunkedArticle
    chunk: Chunk


@dataclass
class VectoredChunkedArticleDiff:
    """For this chunked article, the deleted chunks and new chunks including their vectorized form """
    chunked_article: ChunkedArticle
    new_chunks: list[VectoredChunk] = field(default_factory=list)
    deleted_chunks: list[ChunkMetadata] = field(default_factory=list)


# ======================================================================================================================
# Documents we store in the DB
# ======================================================================================================================

@dataclass_json
@dataclass
class ChunkedArticleMetadataOnly:
    """Just the metadata about a ChunkedArticle, this is what we store in the DB as metadata about the article
    and use to work out what chunks have changed when creating the ChunkedArticleDiff """
    _id: str
    article_metadata: ArticleMetadata
    # keys on the metadata.hash
    chunks_metadata: dict[str, ChunkMetadata] = field(default_factory=dict)
    # the recent chunks we can use to build a suggested question for the user
    suggested_question_chunks: list[Chunk] = field(default_factory=list)

    @classmethod
    def from_chunked_article(cls, chunked_article: ChunkedArticle) -> 'ChunkedArticleMetadataOnly':
        return cls(
            _id=chunked_article.article.metadata.url,
            article_metadata=chunked_article.article.metadata,
            chunks_metadata={chunk.metadata.hash: chunk.metadata for chunk in chunked_article.chunks},
            suggested_question_chunks=chunked_article.chunks[:5]
        )

    @classmethod
    def from_vectored_diff(cls, diff: VectoredChunkedArticleDiff) -> 'ChunkedArticleMetadataOnly':
        if diff.new_chunks:
            suggested_chunks = [v_chunk.chunk for v_chunk in diff.new_chunks[:5]]
        else:
            suggested_chunks = diff.chunked_article.chunks[:5]
        return cls(
            _id=diff.chunked_article.article.metadata.url,
            article_metadata=diff.chunked_article.article.metadata,
            chunks_metadata={chunk.metadata.hash: chunk.metadata for chunk in diff.chunked_article.chunks},
            suggested_question_chunks=suggested_chunks
        )


@dataclass_json
@dataclass
class EmbeddingDocument:
    """This is the document we store in the DB, it has the vectorized chunk and is the thing the app will do the ANN
    sort on"""

    _id: str
    url: str
    title: str
    document_id: str
    chunk_index: int
    content: str
    # vector needs to be $vector when sent to the DB
    # see https://lidatong.github.io/dataclasses-json/#encode-or-decode-using-a-different-name
    vector: list[float] = field(metadata=config(field_name="$vector"))

    @classmethod
    def from_vectored_chunk(cls, vectored_chunk: VectoredChunk) -> 'EmbeddingDocument':
        return cls(
            _id=vectored_chunk.chunk.metadata.hash,
            url=vectored_chunk.chunked_article.article.metadata.url,
            title=vectored_chunk.chunked_article.article.metadata.title,
            document_id=vectored_chunk.chunked_article.article.metadata.url,
            chunk_index=vectored_chunk.chunk.metadata.index,
            content=vectored_chunk.chunk.content,
            vector=vectored_chunk.vector
        )


@dataclass_json
@dataclass
class RecentArticle:
    metadata: ArticleMetadata
    suggested_chunks: list[Chunk] = field(default_factory=list)

    @classmethod
    def from_article_metadata(cls, article: ChunkedArticleMetadataOnly) -> 'RecentArticle':
        return cls(
            metadata=article.article_metadata,
            suggested_chunks=article.suggested_question_chunks
        )


@dataclass_json
@dataclass
class RecentArticles:
    embedding_collection: str = "article_embeddings"
    recent_articles: list[RecentArticle] = field(default_factory=list)
    _id: str = "recent_articles"

    def __post_init__(self):
        self._lock = asyncio.Lock()

    async def update_and_clone(self, article: ChunkedArticleMetadataOnly, clear_list: bool = False) -> 'RecentArticles':
        max_recent_articles: int = 5
        async with self._lock:
            # allow None because it is called like this when switching collections
            if article is not None:
                self.recent_articles = [RecentArticle.from_article_metadata(article)] + self.recent_articles[
                                                                                        :max_recent_articles - 1]
            elif clear_list:
                self.recent_articles = []
            return replace(self)


RECENT_ARTICLES = RecentArticles()
