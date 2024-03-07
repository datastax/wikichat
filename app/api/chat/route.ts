import { AstraDB } from "@datastax/astra-db-ts";
import { OpenAIStream, StreamingTextResponse, Message } from "ai";
import OpenAI from "openai";

const {
  ASTRA_DB_APPLICATION_TOKEN,
  ASTRA_DB_API_ENDPOINT,
  OPENAI_API_KEY,
} = process.env;

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

const client = new AstraDB(ASTRA_DB_APPLICATION_TOKEN, ASTRA_DB_API_ENDPOINT);

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const {messages, llm} = await req.json();
    const previousMessages = messages.slice(0, -1);
    const latestMessage = messages[messages?.length - 1]?.content;

    const collection = await client.collection("article_embeddings");

    const chat_history = formatVercelMessages(previousMessages);

    let question = latestMessage;

    if (chat_history.length > 0) {
      const condensePrompt = `Given the following chat history and a follow up question, If the follow up question references previous parts of the chat rephrase the follow up question to be a standalone question if not use the follow up question as the standalone question.

  <chat_history>
    ${chat_history}
  </chat_history>
  
  Follow Up Question: ${question}
  Standalone question:`

      const condenseResp = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        stream: false,
        messages: [{ role: "user", content: condensePrompt}],
      });

      if (condenseResp.choices[0].message) {
        question = condenseResp.choices[0].message;
      }
    }

    const cursor = collection.find({}, {
      sort: {
        $vectorize: question
      },
      limit: 5,
      projection: {
        $vector: 0,
      }
    });

    const documents = await cursor.toArray();

    const formattedDocs = documents?.map((doc) => {
      return `Title: ${doc.title}
      URL: ${doc.url}
      Content: ${doc.$vectorize}`;
    });

    const context = formattedDocs.join("\n\n");

    const prompt = `You are an AI assistant answering questions about anything from Wikipedia the context will provide you with the most relevant data from wikipedia including the pages title, url, and page content.
If referencing the text/context refer to it as Wikipedia.
At the end of the response add one markdown link using the format: [Title](URL) and replace the title and url with the associated title and url of the more relavant page from the context
This link will not be shown to the user so do not mention it.
The max links you can include is 1, do not provide any other references or annotations.
if the context is empty, answer it to the best of your ability. If you cannot find the answer user's question in the context, reply with "I'm sorry, I'm only allowed to answer questions related to the 10,000 most recently updated Wikipedia pages".

<context>
  ${context}
</context>

QUESTION: ${question}`;

    const resp = await openai.chat.completions.create({
      model: 'gpt-4',
      stream: true,
      messages: [{ role: "user", content: prompt }],
    });

    const stream = OpenAIStream(resp);
 
    return new StreamingTextResponse(stream);
  } catch (e) {
    console.log(e)
    throw e;
  }
}
