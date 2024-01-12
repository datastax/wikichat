from wikichat.processing.articles import load_article, chunk_article, calc_chunk_diff, vectorize_diff, \
    store_article_diff
from wikichat.utils.pipeline import AsyncPipeline, AsyncStep


def create_pipeline(max_items: int = 100) -> AsyncPipeline:
    return AsyncPipeline(max_items=max_items) \
        .add_step(AsyncStep(load_article, 10)) \
        .add_step(AsyncStep(chunk_article, 2)) \
        .add_step(AsyncStep(calc_chunk_diff, 5)) \
        .add_step(AsyncStep(vectorize_diff, 5)) \
        .add_last_step(AsyncStep(store_article_diff, 5))
