import asyncio
import logging
import os
from typing import Callable

from dotenv import load_dotenv

from astrapy.db import AstraDB, AstraDBCollection

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
# NOTE: For embeddings use the EMBEDDING_COLLECTIONS object instead of these directly
EMBEDDINGS_COLLECTION = AstraDBCollection(
    collection_name=_ARTICLE_EMBEDDINGS_NAME, astra_db=ASTRA_DB
)
METADATA_COLLECTION = AstraDBCollection(
    collection_name=_ARTICLE_METADATA_NAME, astra_db=ASTRA_DB
)
SUGGESTIONS_COLLECTION = AstraDBCollection(
    collection_name=_ARTICLE_SUGGESTIONS_NAME, astra_db=ASTRA_DB
)

_ALL_COLLECTIONS: list[AstraDBCollection] = [EMBEDDINGS_COLLECTION, METADATA_COLLECTION,SUGGESTIONS_COLLECTION]
_ROTATED_COLLECTIONS: list[AstraDBCollection] = [EMBEDDINGS_COLLECTION, METADATA_COLLECTION]


# class _EmbeddingCollections():
#
#     def __init__(self, collections: list[AstraDBCollection]):
#         assert len(collections) > 1, "Must have at least 2 collections"
#         self._collections = collections
#         self._current_index = 0
#         self._lock = asyncio.Lock()
#
#     async def rotate(self, async_callback: Callable[[AstraDBCollection, AstraDBCollection], None]) -> None:
#         async with self._lock:
#             # locks not re-entrant :(
#             prev_collection = self._collections[self._current_index]
#             self._current_index = (self._current_index + 1) % len(self._collections)
#             current_collection = self._collections[self._current_index]
#             logging.info(f"Switching to collection from {prev_collection.collection_name} to {current_collection.collection_name}")
#             await async_callback(prev_collection, current_collection)
#
#
#     async def current(self) -> AstraDBCollection:
#         async with self._lock:
#             return self._collections[self._current_index]

#
# EMBEDDING_COLLECTIONS = _EmbeddingCollections([_EMBEDDING_COLLECTION_RED, _EMBEDDING_COLLECTION_GREEN])
#

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
                lambda : collection.delete_many({})
            )
            break
        except Exception:
            logging.exception(f"Retrying, error truncating collection {collection.collection_name}", exc_info=True)