import { Pinecone } from "@pinecone-database/pinecone";
import { mustGetEnv } from "../env";

export function getPineconeIndex() {
  const pc = new Pinecone({ apiKey: mustGetEnv("PINECONE_API_KEY") });
  const indexName = mustGetEnv("PINECONE_INDEX_NAME");
  return pc.index(indexName);
}


