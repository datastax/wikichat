import Bugsnag from "@bugsnag/js";
import { AstraDB } from "@datastax/astra-db-ts";
import { OpenAIStream, StreamingTextResponse } from "ai";
import OpenAI from "openai";
import type { ChatCompletionCreateParams } from 'openai/resources/chat';
import { CATEGORIES } from "../../../utils/consts";

const {
  ASTRA_DB_APPLICATION_TOKEN,
  ASTRA_DB_ENDPOINT,
  ASTRA_DB_SUGGESTIONS_COLLECTION,
  BUGSNAG_API_KEY,
  OPENAI_API_KEY,
} = process.env;

const astraDb = new AstraDB(ASTRA_DB_APPLICATION_TOKEN, ASTRA_DB_ENDPOINT);

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    let docContext = "";

    try {
      const suggestionsCollection = await astraDb.collection(ASTRA_DB_SUGGESTIONS_COLLECTION);

      const suggestionsCursor = suggestionsCollection.find(
        {
          _id: "recent_articles"
        },
        {
          projection: {
            "recent_articles.metadata.title" : 1,
            "recent_articles.suggested_chunks.content" : 1,
          },
        });

      const suggestionsDocuments = await suggestionsCursor.toArray();

      const docsMap = suggestionsDocuments?.map((doc, index) => {
        return doc.recent_articles.map((article, index) => {
          return {
            pageTitle: article.metadata.title,
            content: article.suggested_chunks.map(chunk => chunk.content)
          }
        })
      });

      docContext = JSON.stringify(docsMap);
    } catch (e) {
      console.log("Error querying db...");
    }


    const functions: ChatCompletionCreateParams.Function[] = [

      {
        name: 'get_suggestion_and_category',
        description: 'Prints a suggested question and the category it belongs to.',
        parameters: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              description: 'The suggested questions and their categories.',
              items: {
                type: 'object',
                properties: {
                  category: {
                    type: 'string',
                    enum: CATEGORIES,
                    description: 'The category of the suggested question.',
                  },
                  question: {
                    type: 'string',
                    description:
                      'The suggested question.',
                  },
                },
              },
            },
          },
          required: ['questions'],
        },
      },
    ];

    const response = await openai.chat.completions.create(
      {
        model: "gpt-3.5-turbo-16k",
        stream: true,
        temperature: 1.5,
        messages: [{
          role: "user",
          content: `You are an assistant who creates sample questions to ask a chatbot.
          Given the context below of the most recently added data to the most popular pages on Wikipedia come up with 4 suggested questions
          Only write no more than one question per page and keep them to less than 12 words each
          Do not label which page the question is for/from

          START CONTEXT
          ${docContext}
          END CONTEXT
          `,
        }],
        functions
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