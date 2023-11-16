import { BedrockEmbeddings } from "langchain/embeddings/bedrock";
import { BedrockChat } from "langchain/chat_models/bedrock/web";
import { BaseMessage, AIMessage, HumanMessage } from "langchain/schema";
import { LangChainStream, StreamingTextResponse} from 'ai';
import {AstraDB} from "@datastax/astra-db-ts";

const {
  ASTRA_DB_APPLICATION_TOKEN,
  ASTRA_DB_ID,
  ASTRA_DB_REGION,
  ASTRA_DB_NAMESPACE,
  BEDROCK_AWS_REGION,
  BEDROCK_AWS_ACCESS_KEY_ID,
  BEDROCK_AWS_SECRET_ACCESS_KEY
} = process.env;

const embeddings = new BedrockEmbeddings({
  region: BEDROCK_AWS_REGION,
  credentials: {
    accessKeyId: BEDROCK_AWS_ACCESS_KEY_ID,
    secretAccessKey: BEDROCK_AWS_SECRET_ACCESS_KEY,
  },
  model: "amazon.titan-embed-text-v1"
});

const astraDb = new AstraDB(ASTRA_DB_APPLICATION_TOKEN, ASTRA_DB_ID, ASTRA_DB_REGION, ASTRA_DB_NAMESPACE);

export async function POST(req: Request) {
  try {
    const {messages, useRag, llm, similarityMetric} = await req.json();
    const { stream, handlers, writer } = LangChainStream();
    const bedrock = new BedrockChat({
      region: BEDROCK_AWS_REGION,
      credentials: {
        accessKeyId: BEDROCK_AWS_ACCESS_KEY_ID,
        secretAccessKey: BEDROCK_AWS_SECRET_ACCESS_KEY,
      },
      model: 'ai21.j2-mid-v1',
      streaming: true,
    });

    const latestMessage = messages[messages?.length - 1]?.content;

    let docContext = '';
    if (useRag) {
      const embedded = await embeddings.embedQuery(latestMessage);

      const collection = await astraDb.collection(`aws_${similarityMetric}`);

      const cursor= collection.find(null, {
        sort: {
          $vector: embedded,
        },
        limit: 5,
      });
      
      const documents = await cursor.toArray();
      
      docContext = `
        START CONTEXT
        ${documents?.map(doc => doc.content).join("\n")}
        END CONTEXT
      `
    }
    const ragPrompt = [
      {
        role: 'system',
        content: `You are an AI assistant answering questions about Cassandra and Astra DB. Format responses using markdown where applicable.
        ${docContext} 
        If the answer is not provided in the context, the AI assistant will say, "I'm sorry, I don't know the answer".
      `,
      },
    ]

    bedrock.call(
      [...ragPrompt, ...messages].map(m =>
        m.role == 'user'
          ? new HumanMessage(m.content)
          : new AIMessage(m.content),
    ), {}, [handlers]);

    return new StreamingTextResponse(stream);
  } catch (e) {
    throw e;
  }
}
