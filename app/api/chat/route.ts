import { CohereClient } from "cohere-ai";

import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse, Message as VercelChatMessage} from "ai";
import {AstraDB} from "@datastax/astra-db-ts";
import Bugsnag from '@bugsnag/js';

const {
  ASTRA_DB_APPLICATION_TOKEN,
  ASTRA_DB_ID,
  ASTRA_DB_REGION,
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  COHERE_API_KEY,
  BUGSNAG_API_KEY,
} = process.env;

if (BUGSNAG_API_KEY) {
  Bugsnag.start({ apiKey: BUGSNAG_API_KEY })
}

const cohere = new CohereClient({
  token: COHERE_API_KEY,
});


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const astraDb = new AstraDB(ASTRA_DB_APPLICATION_TOKEN, ASTRA_DB_ID, ASTRA_DB_REGION, ASTRA_DB_NAMESPACE);

export async function POST(req: Request) {
  try {
    const {messages, useRag, llm, similarityMetric} = await req.json();
    const latestMessage = messages[messages?.length - 1]?.content;

    let docContext = '';
    if (useRag) {
      const embedded = await cohere.embed({
        texts: [latestMessage],
        model: "embed-english-light-v3.0",
        inputType: "search_query",
      });

      try {
        const collection = await astraDb.collection(ASTRA_DB_COLLECTION);
        const cursor = collection.find(null, {
          sort: {
            $vector: embedded?.embeddings[0],
          },
          limit: 5,
        });

        const documents = await cursor.toArray();
        const docsMap = documents?.map(doc => { return {title: doc.title, url: doc.url, context: doc.content }});

        docContext = JSON.stringify(docsMap);
      } catch (e) {
        if (BUGSNAG_API_KEY) {
          Bugsnag.notify(e, event => {
            event.addMetadata("chat", {
              latestMessage,
            })
          });
        }
        console.log("Error querying db...");
        docContext = "";
      }
    }

    const Template = {
      role: 'system',
      content: `You are an AI assistant answering questions about anything from Wikipedia the context will provide you with the most relevant page data along with the source pages title and url.
        Refer to the context as wikipedia data. Format responses using markdown where applicable and don't return images.
        If referencing the text/context refer to it as Wikipedia.
        At the end of the response on a line by itself add a markdown link to the Wikipedia url where the most relevant data was found label it with the title of the wikipedia page and no "Source:" or "Wikipedia" prefix or other text.
        The max links you should include is 1 refer to this source as "the source below".

        if the context is empty anwser it to the best of your ability.
        ----------------
        START CONTEXT
        ${docContext}
        END CONTEXT
        ----------------
        QUESTION: ${latestMessage}
        ----------------      
        `
    };

    const response = await openai.chat.completions.create(
      {
        model: llm ?? 'gpt-4',
        stream: true,
        messages: [Template, ...messages],
      }
    );
    const stream = OpenAIStream(response);

    return new StreamingTextResponse(stream);
  } catch (e) {
    if (BUGSNAG_API_KEY) {
      Bugsnag.notify(e);
    }
    throw e;
  }
}
