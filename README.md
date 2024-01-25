# WikiChat

This project is a starter for creating a chatbot using Astra DB. It's designed to be easy to deploy and use, with a focus on performance and usability.

## Features

- **Astra DB Integration**: Store and retrieve data from your Astra DB database with ease.
- **LangChain.js Integration**: Uses the new Astra DB vectorstore to implement RAG.
- **Easy Deployment**: Deploy your chatbot to Vercel with just a few clicks.
- **Customizable**: Modify and extend the chatbot to suit your needs.

## Getting Started

### Prerequisites

- An Astra DB account. You can [create one here](https://astra.datastax.com/register).
    - An Astra Vector Database
- An OpenAI Account and API key.
- A Cohere Account and API key. Note that due to the large volume of ingested data, you'll need a paid plan.

### Setup

1. Clone this repository to your local machine.
2. Install the dependencies by running `npm install` in your terminal.
3. Set up the following environment variables in your IDE or `.env` file:
    - `ASTRA_DB_API_ENDPOINT`: Your Astra DB vector database id **_in a vector-enabled DB_**
    - `ASTRA_DB_APPLICATION_TOKEN`: The generated app token for your Astra database
        - To create a new token go to your database's `Connect` tab and click `Generate Token`. (your Application Token begins with `AstraCS:...`)
    - `OPENAI_API_KEY`: Your OpenAI API key.
    - `COHERE_API_KEY`: Your Cohere API key for embeddings.
    - `LANGCHAIN_TRACING_V2` (optional): Set to `true` to enable tracing
    - `LANGCHAIN_SESSION` (optional): The LangSmith project that will receive traced runs.
    - `LANGCHAIN_API_KEY` (optional): LangSmith API key
4. Populate your database by following the instructions [here](https://github.com/datastax/wikichat/blob/main/scripts/README.md)

### Running the Project

To start the development server, run `npm run dev` in your terminal. Open [http://localhost:3000](http://localhost:3000) to view the chatbot in your browser.

## Deployment

You can easily deploy your chatbot to Vercel by clicking the button below:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/datastax/wikichat&env=ASTRA_DB_API_ENDPOINT,ASTRA_DB_APPLICATION_TOKEN,OPENAI_API_KEY,COHERE_API_KEY)

Remember to set your environment variables to the values obtained when setting up your Astra DB and OpenAI accounts.
