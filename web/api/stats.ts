import { RAG_CONFIG } from "../src/lib/rag/config";

export default async function handler(req: any, res: any) {
  if ((req?.method ?? "GET").toUpperCase() !== "GET") {
    res.statusCode = 405;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Method Not Allowed" }));
    return;
  }

  // Strict JSON shape + field names required by the assignment.
  res.statusCode = 200;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(
    JSON.stringify({
      chunk_size: RAG_CONFIG.chunk_size,
      overlap_ratio: RAG_CONFIG.overlap_ratio,
      top_k: RAG_CONFIG.top_k,
    }),
  );
}


