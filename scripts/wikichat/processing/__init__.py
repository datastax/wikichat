"""
The processing steps for ingesting wikipedia articles are in this module.
"""
import asyncio
import logging
from typing import Any

import wikichat
from wikichat import database
from wikichat.database import SUGGESTIONS_COLLECTION
from wikichat.processing.articles import load_article, chunk_article, calc_chunk_diff, vectorize_diff, \
    store_article_diff
from wikichat.processing.model import RECENT_ARTICLES
from wikichat.utils.metrics import METRICS
from wikichat.utils.pipeline import AsyncPipeline, AsyncStep

"""
Creates the processing pipeline for ingesting wikipedia articles, configuing how many async tasks to run for 
each step. 
"""


def create_pipeline(max_items: int = 100, rotate_collection_every: int = 0) -> AsyncPipeline:
    return AsyncPipeline(max_items=max_items, error_listener=METRICS.listen_to_step_error) \
        .add_step(AsyncStep(load_article, 10)) \
        .add_step(AsyncStep(chunk_article, 2)) \
        .add_step(AsyncStep(calc_chunk_diff, 5)) \
        .add_step(AsyncStep(vectorize_diff, 5)) \
        .add_last_step(AsyncStep(store_article_diff, 5,
                                 listener=_RotationListener(
                                     rotate_collection_every) if rotate_collection_every > 0 else None))


"""
Handed to the AsyncStep to listen when a new article is about to the processed by the store_article_diff step. 

We use this to check if we should rotate the collection, which means truncating the collections. We do this 
because the script is capable of running for a long time, and we want to keep the collections from growing to hold
all of wikipedia. 
"""


class _RotationListener:

    def __init__(self, rotate_collection_every: int):
        self._rotate_collection_every = rotate_collection_every
        self._rotate_lock = asyncio.Lock()

    async def __call__(self, step: AsyncStep, item: Any) -> bool:

        should_rotate, rotations_count, chunks_inserted = await self._should_rotate()
        if not should_rotate:
            return True

        logging.info(
            f"Maybe starting collection rotation {rotations_count + 1} after {chunks_inserted} chunks inserted")
        async with self._rotate_lock:
            # Double check incase someone else rotated while we were waiting for the lock
            rotations_count, chunks_inserted = await METRICS.get_rotation_stats()
            should_rotate, rotations_count, chunks_inserted = await self._should_rotate()
            if not should_rotate:
                logging.info(
                    f"Another worker rotated, current rotatations {rotations_count} and chunks inserted {chunks_inserted}")
                return True

            # We really mean it now !
            logging.info(f"Starting collection rotation {rotations_count + 1} after {chunks_inserted} chunks inserted")
            # if we are in the _rotate_lock all other workers are waiting for us to finish
            # so we can safely rotate the collections, which just means truncating them and clearing the recent articles
            await database.truncate_rotated_collections()

            # Change suggested articles to point to the new collection
            # and clear the list of suggestions, they are not in the new collection.
            recent_articles = await RECENT_ARTICLES.update_and_clone(None, clear_list=True)
            await wikichat.utils.wrap_blocking_io(
                lambda x: SUGGESTIONS_COLLECTION.find_one_and_replace(
                    filter={"_id": x._id},
                    replacement=x.to_dict(),
                    options={"upsert": True}
                ),
                recent_articles
            )
            await METRICS.update_rotation_stats(rotations=1)
        return True

    async def _should_rotate(self) -> (bool, int, int):
        rotations_count, chunks_inserted = await METRICS.get_rotation_stats()
        should_rotate: bool = chunks_inserted > 0 and chunks_inserted >= (
                    self._rotate_collection_every * (rotations_count + 1))
        return should_rotate, rotations_count, chunks_inserted
