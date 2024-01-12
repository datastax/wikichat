import os
from dotenv import load_dotenv

from astrapy.db import AstraDB, AstraDBCollection

load_dotenv()

# The client to connect to the Astra Data API
ASTRA_DB = AstraDB(token=os.getenv("ASTRA_DB_APPLICATION_TOKEN"), api_endpoint=os.getenv("ASTRA_DB_API_ENDPOINT"))

# We have three collections
_ARTICLE_EMBEDDINGS_NAME = "article_embeddings"
_ARTICLE_METADATA_NAME = "article_metadata"
_ARTICLE_SUGGESTIONS_NAME = "article_suggestions"

# Create the collections on the server, this will fail gracefully if they already exist
ASTRA_DB.create_collection(collection_name=_ARTICLE_EMBEDDINGS_NAME, dimension=1024)
ASTRA_DB.create_collection(collection_name=_ARTICLE_METADATA_NAME)
ASTRA_DB.create_collection(collection_name=_ARTICLE_SUGGESTIONS_NAME)

# Create the collection objects this code will use
EMBEDDING_COLLECTION = AstraDBCollection(
    collection_name=_ARTICLE_EMBEDDINGS_NAME, astra_db=ASTRA_DB
)
METADATA_COLLECTION = AstraDBCollection(
    collection_name=_ARTICLE_METADATA_NAME, astra_db=ASTRA_DB
)
SUGGESTIONS_COLLECTION = AstraDBCollection(
    collection_name=_ARTICLE_SUGGESTIONS_NAME, astra_db=ASTRA_DB
)
