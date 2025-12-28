## TED Talk RAG Assistant (API-only)

This directory (`web/`) contains a minimal **Next.js API** implementation for the assignment:

- **Vector DB**: Pinecone
- **LLM + embeddings**: LangChain (`@langchain/openai`) configured for **LLMOD**
- **Endpoints**:
  - `POST /api/prompt`
  - `GET /api/stats`

### Local setup
Set env vars (recommended: in repo-root `../.env`):
- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME`
- `LLMOD_API_KEY`
Optional:
- `PINECONE_NAMESPACE` (default `ted`)
- `LLMOD_BASE_URL` (default `https://api.llmod.ai/v1`)

Install deps:

```bash
npm install
```

### Ingest data into Pinecone (local script)
Ingest a small subset (cheap):

```bash
npm run ingest -- --offset 0 --limit 20 --verbose
```

Then scale incrementally without re-ingesting:

```bash
npm run ingest -- --offset 20 --limit 30 --verbose
```

### Run locally

```bash
npm run dev -- --port 3005
```

Check endpoints:

```bash
curl http://localhost:3005/api/stats
curl -X POST http://localhost:3005/api/prompt -H 'content-type: application/json' -d '{"question":"Which TED talk focuses on education or learning? Return a list of exactly 3 talk titles."}'
```

### Deployment (Vercel)
See `DEPLOYMENT.md`.
