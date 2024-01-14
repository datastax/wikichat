import logging

import wikichat
from wikichat import database
from wikichat.database import SUGGESTIONS_COLLECTION
from wikichat.processing.articles import load_article, chunk_article, calc_chunk_diff, vectorize_diff, \
    store_article_diff
from wikichat.processing.model import RECENT_ARTICLES
from wikichat.utils.pipeline import AsyncPipeline, AsyncStep


def create_pipeline(max_items: int = 100, rotate_collection_every: int = 0) -> AsyncPipeline:
    async def _listen(pipeline: AsyncPipeline, item_count: int):
        if item_count == 0 or rotate_collection_every == 0:
            return True
        elif item_count % rotate_collection_every == 0:
            logging.info(f"Rotating collections after {item_count} items")
            await pipeline.join_all_steps();
            await database.EMBEDDING_COLLECTIONS.rotate(async_callback=_rotation_callback)
        return True

    listener = _listen if rotate_collection_every > 0 else None
    return AsyncPipeline(max_items=max_items, listener=listener) \
        .add_step(AsyncStep(load_article, 10)) \
        .add_step(AsyncStep(chunk_article, 2)) \
        .add_step(AsyncStep(calc_chunk_diff, 5)) \
        .add_step(AsyncStep(vectorize_diff, 5)) \
        .add_last_step(AsyncStep(store_article_diff, 5))


async def _rotation_callback(prev_collection: database.AstraDBCollection,
                             current_collection: database.AstraDBCollection):
    # Change suggested articles to point to the new collection
    # and clear the list of suggestions, they are not in the new collection.
    recent_articles = await RECENT_ARTICLES.update_and_clone(current_collection.collection_name, None,
                                                             clear_list=True)
    await wikichat.utils.wrap_blocking_io(
        lambda x: SUGGESTIONS_COLLECTION.find_one_and_replace(
            filter={"_id": x._id},
            replacement=x.to_dict(),
            options={"upsert": True}
        ),
        recent_articles
    )

    # truncate the old collection for when we switch to it later
    database.try_truncate_collection(prev_collection)
