## Deployment (Vercel) — API-only TED RAG

### What gets deployed
- The Vercel project root should be the `web/` directory.
- Endpoints:
  - `POST /api/prompt`
  - `GET /api/stats`

### Required environment variables (Vercel)
Set these in **Vercel Project → Settings → Environment Variables**:
- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME`
- `LLMOD_API_KEY`
Optional:
- `PINECONE_NAMESPACE` (defaults to `ted`)
- `LLMOD_BASE_URL` (defaults to `https://api.llmod.ai/v1`)

### Build settings
- **Framework preset**: Next.js
- **Root Directory**: `web`
- **Build Command**: `npm run build`
- **Output**: default

### Index requirements (Pinecone)
- Vector dimension must match embeddings: **1536**
- Metric: **cosine** (recommended)

### Local run
From `web/`:
- `npm run dev -- --port 3005`
- `curl http://localhost:3005/api/stats`
- `curl -X POST http://localhost:3005/api/prompt -H 'content-type: application/json' -d '{"question":"..."}'`


