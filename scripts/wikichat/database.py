"""
This file contains the code to setup the database. It will create the collections if they don't exist, and truncate them if they do.

Importing the module initialises the database.
"""
import logging
import os

from astrapy.db import AstraDB, AstraDBCollection
from dotenv import load_dotenv

import wikichat

load_dotenv()

# The client to connect to the Astra Data API
ASTRA_DB = AstraDB(token=os.getenv("ASTRA_DB_APPLICATION_TOKEN"), api_endpoint=os.getenv("ASTRA_DB_API_ENDPOINT"))

# We have three collections
_ARTICLE_EMBEDDINGS_NAME = "article_embeddings"
_ARTICLE_METADATA_NAME = "article_metadata"
_ARTICLE_SUGGESTIONS_NAME = "article_suggestions"
_ALL_COLLECTION_NAMES: list[str] = [_ARTICLE_EMBEDDINGS_NAME, _ARTICLE_METADATA_NAME, _ARTICLE_SUGGESTIONS_NAME]

# Create the collections on the server, this will fail gracefully if they already exist
ASTRA_DB.create_collection(collection_name=_ARTICLE_EMBEDDINGS_NAME, dimension=1024)
ASTRA_DB.create_collection(collection_name=_ARTICLE_METADATA_NAME)
ASTRA_DB.create_collection(collection_name=_ARTICLE_SUGGESTIONS_NAME)

# Create the collection objects this code will use
EMBEDDINGS_COLLECTION = AstraDBCollection(
    collection_name=_ARTICLE_EMBEDDINGS_NAME, astra_db=ASTRA_DB
)
METADATA_COLLECTION = AstraDBCollection(
    collection_name=_ARTICLE_METADATA_NAME, astra_db=ASTRA_DB
)
SUGGESTIONS_COLLECTION = AstraDBCollection(
    collection_name=_ARTICLE_SUGGESTIONS_NAME, astra_db=ASTRA_DB
)

_ALL_COLLECTIONS: list[AstraDBCollection] = [EMBEDDINGS_COLLECTION, METADATA_COLLECTION, SUGGESTIONS_COLLECTION]
_ROTATED_COLLECTIONS: list[AstraDBCollection] = [EMBEDDINGS_COLLECTION, METADATA_COLLECTION]


async def truncate_all_collections() -> None:
    for collection in _ALL_COLLECTIONS:
        await try_truncate_collection(collection)


async def truncate_rotated_collections() -> None:
    for collection in _ROTATED_COLLECTIONS:
        await try_truncate_collection(collection)


async def try_truncate_collection(collection: AstraDBCollection) -> None:
    # This can timeout sometimes, so lets retry :)
    for i in range(5):
        try:
            logging.info(f"Attempt {i} Truncating collection {collection.collection_name}")
            await wikichat.utils.wrap_blocking_io(
                lambda: collection.delete_many({})
            )
            break
        except Exception:
            logging.exception(f"Retrying, error truncating collection {collection.collection_name}", exc_info=True)
