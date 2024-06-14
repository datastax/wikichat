import { CohereEmbeddings } from "@langchain/cohere";
import { ChatOpenAI } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableBranch, RunnableLambda, RunnableMap, RunnableSequence } from "@langchain/core/runnables";
import { AstraDBVectorStore, AstraLibArgs } from "@langchain/community/vectorstores/astradb";

import { StreamingTextResponse, Message } from "ai";

const { ASTRA_DB_APPLICATION_TOKEN, ASTRA_DB_API_ENDPOINT, COHERE_API_KEY, OPENAI_API_KEY } = process.env;

interface ChainInput {
    chat_history: string;
    question: string;
}

const condenseQuestionTemplate = `Given the following chat history and a follow up question, If the follow up question references previous parts of the chat rephrase the follow up question to be a standalone question if not use the follow up question as the standalone question.

<chat_history>
  {chat_history}
</chat_history>

Follow Up Question: {question}
Standalone question:`;

const condenseQuestionPrompt = PromptTemplate.fromTemplate(condenseQuestionTemplate);

const questionTemplate = `You are an AI assistant answering questions about anything from Wikipedia the context will provide you with the most relevant data from wikipedia including the pages title, url, and page content.
If referencing the text/context refer to it as Wikipedia.
At the end of the response add one markdown link using the format: [Title](URL) and replace the title and url with the associated title and url of the more relavant page from the context
This link will not be shown to the user so do not mention it.
The max links you can include is 1, do not provide any other references or annotations.
if the context is empty, answer it to the best of your ability. If you cannot find the answer user's question in the context, reply with "I'm sorry, I'm only allowed to answer questions related to the 10,000 most recently updated Wikipedia pages".

<context>
  {context}
</context>

QUESTION: {question}  
`;

const prompt = PromptTemplate.fromTemplate(questionTemplate);
let documentContext = "";
let url = "";
const combineDocumentsFn = (docs: Document[]) => {
    const serializedDocs = docs.map(doc => {
        documentContext += doc.pageContent;
        url = doc.metadata.url;
        return `Title: ${doc.metadata.title}
URL: ${doc.metadata.url}
Content: ${doc.pageContent}`;
    });
    return serializedDocs.join("\n\n");
};

const formatVercelMessages = (chatHistory: Message[]) => {
    const formattedDialogueTurns = chatHistory.map(message => {
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
        const { messages, llm } = await req.json();
        const previousMessages = messages.slice(0, -1);
        const latestMessage = messages[messages?.length - 1]?.content;

        const embeddings = new CohereEmbeddings({
            apiKey: COHERE_API_KEY,
            inputType: "search_query",
            model: "embed-english-v3.0",
        });

        const chatModel = new ChatOpenAI({
            temperature: 0.5,
            openAIApiKey: OPENAI_API_KEY,
            modelName: llm ?? "gpt-4",
            streaming: true,
        });

        const astraConfig: AstraLibArgs = {
            token: ASTRA_DB_APPLICATION_TOKEN,
            endpoint: ASTRA_DB_API_ENDPOINT,
            collection: "article_embeddings",
            contentKey: "content",
        };

        const vectorStore = new AstraDBVectorStore(embeddings, astraConfig);

        await vectorStore.initialize();

        const astraRetriever = vectorStore.asRetriever();

        const hasChatHistoryCheck = RunnableLambda.from(
            (input: ChainInput) => input.chat_history.length > 0,
        ).withConfig({ runName: "hasChatHistoryCheck" });

        const chatHistoryQuestionChain = RunnableSequence.from([
            condenseQuestionPrompt,
            chatModel,
            new StringOutputParser(),
        ]).withConfig({ runName: "chatHistoryQuestionChain" });

        const noChatHistoryQuestionChain = RunnableLambda.from((input: ChainInput) => input.question).withConfig({
            runName: "noChatHistoryQuestionChain",
        });

        const condenseChatBranch = RunnableBranch.from([
            [hasChatHistoryCheck, chatHistoryQuestionChain],
            noChatHistoryQuestionChain,
        ]).withConfig({ runName: "condenseChatBranch" });

        const astraRetrieverChain = astraRetriever
            .pipe(combineDocumentsFn)
            .withConfig({ runName: "astraRetrieverChain" });

        const mapQuestionAndContext = RunnableMap.from({
            question: (input: string) => input,
            context: astraRetrieverChain,
        }).withConfig({ runName: "mapQuestionAndContext" });

        const chain = RunnableSequence.from([
            condenseChatBranch,
            mapQuestionAndContext,
            prompt,
            chatModel,
            new StringOutputParser(),
        ]).withConfig({ runName: "chatChain" });

        let runIdResolver;
        const runIdPromise = new Promise<string>(resolve => {
            runIdResolver = resolve;
        });
        const stream = await chain.stream(
            {
                chat_history: formatVercelMessages(previousMessages),
                question: latestMessage,
            },
            {
                callbacks: [
                    {
                        handleChainStart(_chain, _inputs, runId) {
                            runIdResolver(runId);
                        },
                    },
                ],
            },
        );
        const runId = await runIdPromise;
        return new StreamingTextResponse(stream, {
            headers: {
                "x-langsmith-run-id": runId ?? "",
                "context-Documents": documentContext ?? "",
                "context-url": url ?? "",
                "context-question": latestMessage ?? "",
            },
        });
    } catch (e) {
        console.log(e);
        throw e;
    }
}
