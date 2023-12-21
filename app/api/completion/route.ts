import {AstraDB} from "@datastax/astra-db-ts";
import { OpenAIStream, StreamingTextResponse, Message as VercelChatMessage} from "ai";
import OpenAI from 'openai';
import { CohereClient } from "cohere-ai";

const {
  ASTRA_DB_APPLICATION_TOKEN,
  ASTRA_DB_ENDPOINT,
  ASTRA_DB_COLLECTION,
  COHERE_API_KEY,
  BUGSNAG_API_KEY,
} = process.env;

const astraDb = new AstraDB(ASTRA_DB_APPLICATION_TOKEN, ASTRA_DB_ENDPOINT);

const cohere = new CohereClient({
  token: COHERE_API_KEY,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    let docContext = '';

    // const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // const currentDate = new Date();
    // const day = currentDate.getDate();
    // const month = months[currentDate.getMonth()];
    // const year = currentDate.getFullYear();
    
    // // add the appropriate suffix to the day
    // const getDayWithSuffix = (day) => {
    //   if (day >= 11 && day <= 13) {
    //     return day + "th";
    //   }
    //   switch (day % 10) {
    //     case 1:
    //       return day + "st";
    //     case 2:
    //       return day + "nd";
    //     case 3:
    //       return day + "rd";
    //     default:
    //       return day + "th";
    //   }
    // }
    
    // const formattedDate = `${month} ${getDayWithSuffix(day)} ${year}`;

    // const embedded = await cohere.embed({
    //   texts:[formattedDate],
    //   model: "embed-english-light-v3.0",
    //   inputType: "search_query",
    // });

    try {
      // const collection = await astraDb.collection(ASTRA_DB_COLLECTION);
      const metadataCollection = await astraDb.collection("article_metadata");

      // const cursor = collection.find(null, {
      //   sort: {
      //     $vector: embedded?.embeddings[0],
      //   },
      //   limit: 20,
      // });

      const metadataCursor = metadataCollection.find({},
        {
          sort: { "article_metadata.modified_timestamp": -1 },
          projection: {
            "article_metadata.title" : 1,
            "suggested_question_chunks" : 1
          },
          limit: 3
        });

      // const documents = await cursor.toArray();

      // const docsMap = documents?.map(doc => { return {title: doc.title, context: doc.content }});

      const metadataDocuments = await metadataCursor.toArray();

      const metadataDocsMap = metadataDocuments?.map(doc => { 
        return {
          title: doc.article_metadata.title, 
          content: doc.suggested_question_chunks.map(chunk => chunk.content)
        }
      });

      console.log(metadataDocsMap);
      
      docContext = JSON.stringify(metadataDocsMap);

    } catch (e) {
      console.log("Error querying db...");
    }

    const response = await openai.chat.completions.create(
      {
        model: 'gpt-3.5-turbo',
        stream: true,
        temperature: 1.5,
        messages: [{
          role: 'user',
          content: `You are an assistant who creates sample questions to ask a chatbot.
          Given the context below of the most recently added data to the most popular pages on Wikipedia come up with 4 suggested questions
          Make the suggested questions on a variety of topics and keep them to less than 12 words each

          START CONTEXT
          ${docContext}
          END CONTEXT
          `,
        }],
      }
    );
    const stream = OpenAIStream(response);

    return new StreamingTextResponse(stream);
  } catch (e) {
    console.error(e);
  }
}