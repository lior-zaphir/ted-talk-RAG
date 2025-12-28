// Chosen RAG hyperparameters (must be reflected by GET /api/stats later)
export const RAG_CONFIG = {
  // NOTE: we approximate tokens during chunking; keep comfortably under 2048 max.
  chunk_size: 1024,
  overlap_ratio: 0.2,
  top_k: 8,
} as const;

export const EMBEDDING_MODEL = "RPRTHPB-text-embedding-3-small" as const;
export const CHAT_MODEL = "RPRTHPB-gpt-5-mini" as const;


