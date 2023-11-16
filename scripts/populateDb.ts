import { AstraDB } from "@datastax/astra-db-ts";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import 'dotenv/config'
import sampleData from './sample_data.json';
import { SimilarityMetric } from "../app/hooks/useConfiguration";
import { BedrockEmbeddings } from "langchain/embeddings/bedrock";

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

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
});

const similarityMetrics: SimilarityMetric[] = [
  'cosine',
  'euclidean',
  'dot_product',
]

const createCollection = async (similarity_metric: SimilarityMetric = 'cosine') => {
  const res = await astraDb.createCollection(`aws_${similarity_metric}`, {
    vector: {
      size: 1536,
      function: similarity_metric,
    }
  });
  console.log(res);
};

const loadSampleData = async (similarity_metric: SimilarityMetric = 'cosine') => {
  const collection = await astraDb.collection(`aws_${similarity_metric}`);
  for await (const { url, title, content} of sampleData) {
    const chunks = await splitter.splitText(content);
    let i = 0;
    for await (const chunk of chunks) {
      const response = await embeddings.embedQuery(chunk);

      const res = await collection.insertOne({
        document_id: `${url}-${i}`,
        $vector: response,
        url,
        title,
        content: chunk
      });
      i++;
    }
  }
};

similarityMetrics.forEach(metric => {
  createCollection(metric).then(() => loadSampleData(metric));
});
