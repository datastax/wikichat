import Bugsnag from '@bugsnag/js';
import { CohereEmbeddings } from "@langchain/cohere";
import { Document } from "@langchain/core/documents";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  AstraDBVectorStore,
  AstraLibArgs,
} from "@langchain/community/vectorstores/astradb";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { PromptTemplate } from "langchain/prompts";
import { StreamingTextResponse, Message } from "ai";

const {
  ASTRA_DB_APPLICATION_TOKEN,
  ASTRA_DB_ENDPOINT,
  ASTRA_DB_COLLECTION,
  COHERE_API_KEY,
  BUGSNAG_API_KEY,
  OPENAI_API_KEY,
} = process.env;

if (BUGSNAG_API_KEY) {
  Bugsnag.start({ apiKey: BUGSNAG_API_KEY })
}

const Template = `You are an AI assistant answering questions about anything from Wikipedia the context will provide you with the most relevant page data along with the source pages title and url.
Refer to the context as wikipedia data. Format responses using markdown where applicable and don't return images.
If referencing the text/context refer to it as Wikipedia.
At the end of the response on a line by itself add one markdown link to the Wikipedia url where the most relevant data was found label it with the title of the wikipedia page and no "Source:" or "Wikipedia" prefix or other text.
The max links you should include is 1 refer to this source as "the source below".
if the context is empty anwser it to the best of your ability.

<context>
  {context}
</context>

<chat_history>
  {chat_history}
</chat_history>

QUESTION: {question}  
`;

const prompt = PromptTemplate.fromTemplate(Template);

const combineDocumentsFn = (docs: Document[]) => {
  const serializedDocs = docs.map((doc) => doc.pageContent);
  return serializedDocs.join("\n\n");
};

const formatVercelMessages = (chatHistory: Message[]) => {
  const formattedDialogueTurns = chatHistory.map((message) => {
    if (message.role === "user") {
      return `Human: ${message.content}`;
    } else if (message.role === "assistant") {
      return `Assistant: ${message.content}`;
    } else {
      return `${message.role}: ${message.content}`;
    }
  });
  return formattedDialogueTurns.join("\n");
};

export async function POST(req: Request) {
  try {
    const {messages, llm} = await req.json();
    const previousMessages = messages.slice(0, -1);
    const latestMessage = messages[messages?.length - 1]?.content;

    const embeddings = new CohereEmbeddings({
      apiKey: COHERE_API_KEY,
      inputType: 'search_query',
      model: 'embed-english-light-v3.0',
    });
    
    const chatModel = new ChatOpenAI({
      temperature: 0.5,
      openAIApiKey: OPENAI_API_KEY,
      modelName: llm ?? "gpt-4",
      streaming: true,
    });
    
    const astraConfig: AstraLibArgs = {
      token: ASTRA_DB_APPLICATION_TOKEN,
      endpoint: ASTRA_DB_ENDPOINT,
      collection: ASTRA_DB_COLLECTION,
      contentKey: "content",
    };

    const vectorStore = new AstraDBVectorStore(embeddings, astraConfig);

    await vectorStore.initialize();

    const retriever = vectorStore.asRetriever();

    const chain = RunnableSequence.from([
      {
        context: RunnableSequence.from([
          (input) => input.question,
          retriever.pipe(combineDocumentsFn),
        ]),
        chat_history: (input) => input.chat_history,
        question: (input) => input.question,
      },
      prompt,
      chatModel,
      new StringOutputParser(),
    ])

    const stream = await chain.stream({
      chat_history: formatVercelMessages(previousMessages),
      question: latestMessage, 
    });

    return new StreamingTextResponse(stream);
  } catch (e) {
    if (BUGSNAG_API_KEY) {
      Bugsnag.notify(e);
    }
    throw e;
  }
}
