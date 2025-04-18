"""
Utility commands for interacting with the database to view when has been written.

These are not used by the wikichat application, but are useful for debugging and understanding what is in the database.
"""

import asyncio
import json
import logging

from wikichat import database
from wikichat.commands.model import EmbedAndSearchArgs, SuggestedSearchArgs
from wikichat.database import EMBEDDINGS_COLLECTION, SUGGESTIONS_COLLECTION
from wikichat.processing import embeddings
from wikichat.processing.model import RecentArticles


# ======================================================================================================================
# Commands
# ======================================================================================================================


async def suggested_articles(args: None) -> None:
    docs = database.SUGGESTIONS_COLLECTION.find(
        filter={"_id": "recent_articles"},
        projection={
            "embedding_collection": 1,
            "recent_articles.metadata.title": 1,
            "recent_articles.suggested_chunks.content": 1,
        },
    )

    print(json.dumps(docs, indent=2))


async def embed_and_search(args: EmbedAndSearchArgs) -> None:
    # embed the question
    question_vectors = await embeddings.get_embeddings(
        [args.query], input_type="search_query"
    )
    question_vector: list[float] = question_vectors[0]

    limit = args.limit or 5
    filter = args._filter or {}
    resp = EMBEDDINGS_COLLECTION.find(
        filter,
        sort={"$vector": question_vector},
        projection={"title": 1, "url": 1, "content": 1},
        limit=limit,
    )

    print(f"QUERY: {args.query}")
    print(f"Filter: {filter}")
    print(f"Limit: {limit} ")
    print("Ordered Results:")
    async for doc in resp:
        print(json.dumps(doc, indent=2))


async def suggested_search(args: SuggestedSearchArgs) -> None:
    count = 1
    while args.repeats == 0 or (args.repeats != 0 and count <= args.repeats):
        resp_list = await SUGGESTIONS_COLLECTION.find(
            filter={"_id": "recent_articles"},
            limit=1,
        ).to_list()
        recent_articles = RecentArticles.from_dict(resp_list[0])  # type: ignore[attr-defined]

        question = f"I want to know more about this topic: {recent_articles.recent_articles[0].metadata.title}"
        question_vectors = await embeddings.get_embeddings(
            [question], input_type="search_query"
        )
        question_vector: list[float] = question_vectors[0]

        resp = EMBEDDINGS_COLLECTION.find(
            sort={"$vector": question_vector},
            projection={"title": 1, "url": 1, "content": 1},
            limit=args.limit,
        )

        logging.info(f"QUERY: {question}")
        async for doc in resp:
            logging.info(
                f"Title: {doc['title']}\nURL: {doc['url']}\nContent: {doc['content'][:100]}...\n"
            )
        count += 1

        await asyncio.sleep(args.delay_secs)
