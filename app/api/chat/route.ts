import { BedrockEmbeddings } from "langchain/embeddings/bedrock";
import { BedrockChat } from "langchain/chat_models/bedrock/web";
import { ConversationalRetrievalQAChain } from "langchain/chains";
import { AIMessage, HumanMessage } from "langchain/schema";
import { BytesOutputParser } from 'langchain/schema/output_parser';
import { PromptTemplate } from 'langchain/prompts';
import { LangChainStream, StreamingTextResponse, Message as VercelChatMessage,} from 'ai';
import {AstraDB} from "@datastax/astra-db-ts";
import { RunnablePassthrough, RunnableSequence } from "langchain/dist/schema/runnable";
import { StringOutputParser } from "langchain/schema/output_parser";

const {
  ASTRA_DB_APPLICATION_TOKEN,
  ASTRA_DB_ID,
  ASTRA_DB_REGION,
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  BEDROCK_AWS_REGION,
  BEDROCK_AWS_ACCESS_KEY_ID,
  BEDROCK_AWS_SECRET_ACCESS_KEY,
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

const formatMessage = (message: VercelChatMessage) => {
  return `${message.role}: ${message.content}`;
};

export async function POST(req: Request) {
  try {
    const {messages, useRag, llm, similarityMetric} = await req.json();
    const latestMessage = messages[messages?.length - 1]?.content;

    const { stream, handlers, } = LangChainStream();
    const bedrock = new BedrockChat({
      region: BEDROCK_AWS_REGION,
      credentials: {
        accessKeyId: BEDROCK_AWS_ACCESS_KEY_ID,
        secretAccessKey: BEDROCK_AWS_SECRET_ACCESS_KEY,
      },
      maxTokens: 1000,
      model: llm,
      streaming: true,
    });

    let docContext = '';
    if (useRag) {
      const embedded = await embeddings.embedQuery(latestMessage);

      const collection = await astraDb.collection(ASTRA_DB_COLLECTION);

      const cursor= collection.find(null, {
        sort: {
          $vector: embedded,
        },
        limit: 5,
      });
      
      const documents = await cursor.toArray();
      
      docContext = `${documents?.map(doc => doc.content).join("\n")}`
    }
    const Template = {
      role: 'system',
      content: `You are an AI assistant answering questions about anything from Wikipedia the context will provide you with the most relevant page data. Format responses using markdown where applicable and don't return images.
       ----------------
        CONTEXT: ${docContext}
        ----------------
        QUESTION: ${latestMessage}
        ----------------
        If the answer is not provided in the context, the AI assistant will say, "I'm sorry, I don't know the answer".
      `
    };
    // const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);

    // const promptTemplate = PromptTemplate.fromTemplate(Template.content);

    // const outputParser = new BytesOutputParser();

    // const chain = prompt.pipe(bedrock).pipe(outputParser);

    // const stream = chain.stream({
    //   context: docContext,
    //   chatHistory: formattedPreviousMessages.join('\n'),
    //   input: latestMessage
    // });

    // const chain = RunnableSequence.from([
    //   {
    //     context:RunnablePassthrough.assign(() => ) docContext,
    //     input: latestMessage,
    //     chatHistory: messages.slice(0, -1).map(formatMessage).join('\n'),
    //   },
    //   prompt,
    //   bedrock,
    //   new StringOutputParser(),
    // ])

    // const formattedPrompt = promptTemplate.format({
    //   context: docContext,
    //   input: latestMessage,
    // });

    bedrock.call(
      [Template, ...messages].map(m =>
        m.role == 'user'
          ? new HumanMessage(m.content)
          : new AIMessage(m.content),
      ),
      {},
      [handlers]
    );

    return new StreamingTextResponse(stream);
  } catch (e) {
    throw e;
  }
}
