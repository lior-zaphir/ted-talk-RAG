## Environment variables (local + Vercel)

### Pinecone
- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME`
- `PINECONE_NAMESPACE` (optional; default `ted`)

### RPRTHPB models (OpenAI-compatible client)
- `LLMOD_API_KEY` (preferred if you use LLMOD)
- `LLMOD_BASE_URL` (optional; set if your provider requires a custom base URL)
- `RPRTHPB_API_KEY` (fallback)
- `RPRTHPB_BASE_URL` (optional fallback)

### Ingestion (local only)
- `TED_CSV_PATH` (default: `../ted_talks_en.csv`)
- `INGEST_LIMIT_TALKS` (default: `100`)
- `EMBED_CACHE_PATH` (default: `.rag_cache/embeddings.jsonl`)


