"""
Initialise and call the Cohere client to get embeddings
"""
import logging
import os

import cohere
from cohere.responses import Embeddings
from dotenv import load_dotenv

load_dotenv()

COHERE_CLIENT = cohere.AsyncClient(os.getenv("COHERE_API_KEY"))
EMBEDDING_MODEL = 'embed-english-v3.0'


async def get_embeddings(texts: list[str], input_type: str = 'search_document') -> list[list[float]]:
    try:
        # Cohere client will batch up the texts to the size it wants, so send all the chunks at once
        response: Embeddings = await COHERE_CLIENT.embed(
            texts=texts,
            model=EMBEDDING_MODEL,
            input_type=input_type
        )
    except Exception:
        logging.error(f"Error vectorizing texts", exc_info=True)
        raise

    # response.embeddings is a list and has the same number of elements as the chunks
    assert len(response.embeddings) == len(texts)
    return response.embeddings
