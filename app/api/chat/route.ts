import { BedrockEmbeddings } from "langchain/embeddings/bedrock";
import { BedrockChat } from "langchain/chat_models/bedrock/web";
import { AIMessage, HumanMessage, SystemMessage } from "langchain/schema";
import { CohereClient } from "cohere-ai";

import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse, Message as VercelChatMessage} from "ai";
import {AstraDB} from "@datastax/astra-db-ts";

const {
  ASTRA_DB_APPLICATION_TOKEN,
  ASTRA_DB_ID,
  ASTRA_DB_REGION,
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  BEDROCK_AWS_REGION,
  BEDROCK_AWS_ACCESS_KEY_ID,
  BEDROCK_AWS_SECRET_ACCESS_KEY,
  COHERE_API_KEY,
} = process.env;

const cohere = new CohereClient({
  token: COHERE_API_KEY,
});


const embeddings = new BedrockEmbeddings({
  region: BEDROCK_AWS_REGION,
  credentials: {
    accessKeyId: BEDROCK_AWS_ACCESS_KEY_ID,
    secretAccessKey: BEDROCK_AWS_SECRET_ACCESS_KEY,
  },
  model: "amazon.titan-embed-text-v1"
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const astraDb = new AstraDB(ASTRA_DB_APPLICATION_TOKEN, ASTRA_DB_ID, ASTRA_DB_REGION, ASTRA_DB_NAMESPACE);

const formatMessage = (message: VercelChatMessage) => {
  return `${message.role}: ${message.content}`;
};

export async function POST(req: Request) {
  try {
    const {messages, useRag, llm, similarityMetric} = await req.json();
    const latestMessage = messages[messages?.length - 1]?.content;

    // const { stream, handlers, } = LangChainStream();
    // const bedrock = new BedrockChat({
    //   region: BEDROCK_AWS_REGION,
    //   credentials: {
    //     accessKeyId: BEDROCK_AWS_ACCESS_KEY_ID,
    //     secretAccessKey: BEDROCK_AWS_SECRET_ACCESS_KEY,
    //   },
    //   maxTokens: 2048,
    //   model: llm,
    //   streaming: true,
    // });

    let docContext = '';
    if (useRag) {
      // const embedded = await embeddings.embedQuery(latestMessage);

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
          limit: 3,
        });

        const documents = await cursor.toArray();
        const docsMap = documents?.map(doc => { return {title: doc.title, url: doc.url, context: doc.content }});

        docContext = JSON.stringify(docsMap);
      } catch (e) {
        console.log("Error querying db...");
        docContext = "";
      }
    }

    const Template = {
      role: 'system',
      content: `You are an AI assistant answering questions about anything from Wikipedia the context will provide you with the most relevant page data along with the source pages title and url.
        Refer to the context as wikipedia data. Format responses using markdown where applicable and don't return images.
        If referencing the text/context refer to it as Wikipedia.
        At the end of the response add a link to the Wikipedia data url most of your information came from, refer to this source as "the source below".
        ----------------
        START CONTEXT
        ${docContext}
        END CONTEXT
        ----------------
        QUESTION: ${latestMessage}
        ----------------      
        `
    };

    // bedrock.call(
    //   [Template, ...messages].map(m =>
    //     m.role == 'user'
    //       ? new HumanMessage(m.content)
    //       : m.role == 'system' ? new SystemMessage(m.content)
    //       : new AIMessage(m.content),
    //   ),
    //   { stop: ['Human: ']},
    //   [handlers]
    // );

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
    throw e;
  }
}
