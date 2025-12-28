import { RAG_CONFIG } from "./config";
import { getPineconeIndex } from "../pinecone/client";
import { PineconeStore } from "@langchain/pinecone";
import { getLangChainEmbeddings } from "../models/rprthpb";

export type RetrievedChunk = {
  talk_id: string;
  title: string;
  speaker_1?: string;
  chunk: string;
  score: number;
};

const storeByNamespace = new Map<string, Promise<PineconeStore>>();

async function getStore(namespace: string): Promise<PineconeStore> {
  const existing = storeByNamespace.get(namespace);
  if (existing) return existing;

  const p = (async () => {
    const embeddings = getLangChainEmbeddings();
    const pineconeIndex = getPineconeIndex();
    return await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex,
      namespace,
      // Our ingestion stores the text under metadata.chunk
      textKey: "chunk",
    });
  })();

  storeByNamespace.set(namespace, p);
  return p;
}

export async function retrieveTopK(args: {
  question: string;
  topK?: number;
  namespace?: string;
}): Promise<RetrievedChunk[]> {
  const topK = args.topK ?? RAG_CONFIG.top_k;
  const namespace = args.namespace ?? process.env.PINECONE_NAMESPACE ?? "ted";

  const q = (args.question ?? "").trim();
  if (!q) return [];

  const store = await getStore(namespace);
  const results = await store.similaritySearchWithScore(q, topK);

  return results
    .map(([doc, score]) => {
      const md = (doc.metadata ?? {}) as Record<string, unknown>;
      return {
        talk_id: String(md.talk_id ?? ""),
        title: String(md.title ?? ""),
        speaker_1: md.speaker_1 ? String(md.speaker_1) : undefined,
        chunk: doc.pageContent ?? "",
        score: typeof score === "number" ? score : 0,
      } satisfies RetrievedChunk;
    })
    .filter((x) => x.talk_id && x.title && x.chunk);
}


