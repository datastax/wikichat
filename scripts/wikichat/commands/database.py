import json

from astrapy.db import AstraDBCollection

from wikichat import database
from wikichat.processing import embeddings
from wikichat.database import EMBEDDING_COLLECTIONS

from wikichat.commands.model import EmbedAndSearchArgs


# ======================================================================================================================
# Commands
# ======================================================================================================================

async def suggested_articles(args: None) -> None:

    docs = database.SUGGESTIONS_COLLECTION.find(
        filter={"_id": "recent_articles"},
        projection={"embedding_collection": 1, "recent_articles.metadata.title": 1, "recent_articles.suggested_chunks.content": 1},
    )

    print(json.dumps(docs, indent=2))

async def embed_and_search(args: EmbedAndSearchArgs) -> None:
    # embed the question
    question_vectors = await embeddings.get_embeddings([args.query], input_type='search_query')
    question_vector: list[float] = question_vectors[0]

    limit = args.limit or 5
    filter = args._filter or {}
    col: AstraDBCollection = await EMBEDDING_COLLECTIONS.current()
    resp = col.find(
        filter=filter,
        sort={"$vector": question_vector},
        projection={"title": 1, "url": 1, "content": 1},
        options={"limit": limit})

    print(f"QUERY: {args.query}")
    print(f"Filter: {filter}")
    print(f"Limit: {limit} ")
    print("Ordered Results:")
    for doc in resp["data"]["documents"]:
        import json
        print(json.dumps(doc, indent=2))
