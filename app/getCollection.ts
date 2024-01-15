'use server'
import { AstraDB } from "@datastax/astra-db-ts";

const getCollection = async (): Promise<string> => {
  const astraDb = new AstraDB(process.env.ASTRA_DB_APPLICATION_TOKEN, process.env.ASTRA_DB_ENDPOINT);
  const suggestionsCollection = await astraDb.collection(process.env.ASTRA_DB_SUGGESTIONS_COLLECTION);

  const suggestionsCursor = suggestionsCollection.find(
    {
      _id: "recent_articles"
    },
    {
      projection: {
        "embedding_collection": 1,
      },
    });

  const suggestionsDocuments = await suggestionsCursor.toArray();

  return suggestionsDocuments[0].embedding_collection;
}

export default getCollection;
