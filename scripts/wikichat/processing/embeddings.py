"""
Initialise and call the Cohere client to get embeddings
"""

import logging
import os
from typing import List

import cohere
from dotenv import load_dotenv

EMBED_RESULT_TYPE = cohere.types.embed_response.EmbeddingsByTypeEmbedResponse

load_dotenv()

COHERE_CLIENT = cohere.AsyncClient(os.getenv("COHERE_API_KEY"))
EMBEDDING_MODEL = "embed-english-v3.0"


async def get_embeddings(
    texts: list[str], input_type: str = "search_document"
) -> list[list[float]]:
    try:
        # Cohere client will batch up the texts to the size it wants, so send all the chunks at once
        response: EMBED_RESULT_TYPE = await COHERE_CLIENT.embed(  # type: ignore[assignment]
            texts=texts,
            model=EMBEDDING_MODEL,
            input_type=input_type,
            embedding_types=["float"],
        )
    except Exception:
        logging.error("Error vectorizing texts", exc_info=True)
        raise

    # response.embeddings is a list and has the same number of elements as the chunks
    float_lists: List[List[float]] = response.embeddings.float  # type: ignore[attr-defined]
    assert len(float_lists) == len(texts)
    return float_lists
