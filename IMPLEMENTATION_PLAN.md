# TED Talk RAG Assistant — Implementation Plan

## Goal (from assignment)
Build and deploy a **TED Talk Retrieval-Augmented Generation (RAG) assistant** that answers questions **strictly and only** using the provided dataset (`ted_talks_en.csv`) (metadata + transcript passages). If an answer is not supported by retrieved context, respond: **“I don’t know based on the provided TED data.”**

## Hard Requirements Checklist
- **Dataset**: `ted_talks_en.csv` (schema includes `talk_id`, `title`, `speaker_1`, `topics`, `transcript`, etc.).
- **Models**:
  - `RPRTHPB-text-embedding-3-small` (**1536 dims**)
  - `RPRTHPB-gpt-5-mini`
- **Vector DB**: **Pinecone** (index must remain active until grading).
- **Deployment**: **Vercel** (submit public live URL).
- **Budget**: **$5 total** (development + testing) → avoid re-embedding; iterate on a small subset first.
- **RAG Hyperparameters** (must choose & report; max constraints):
  - `chunk_size` ≤ 2048 tokens
  - `overlap_ratio` ≤ 0.3
  - `top_k` ≤ 30
- **HTTP API**:
  - `POST /api/prompt`
  - `GET /api/stats` (strict field names)

## Target Architecture (Vercel-friendly)
Implement as a **Vercel-deployable web app** with serverless API routes (recommended: **Next.js** API routes).

- **Ingestion (offline / local script)**:
  - Read CSV
  - Normalize + chunk transcripts
  - Embed chunks (1536 dims)
  - Upsert to Pinecone with metadata
  - Write a small local cache file to prevent repeated embedding during iteration

- **Query (online / API route)**:
  - Embed the user question
  - Retrieve `top_k` chunks from Pinecone
  - Build an augmented prompt with:
    - Required **system prompt section**
    - A **user prompt** containing the question + retrieved context snippets
  - Call `RPRTHPB-gpt-5-mini`
  - Return JSON with `response`, `context`, and `Augmented_prompt`

## Data Modeling in Pinecone
### Record = one transcript chunk
- **Vector**: embedding of chunk text using `RPRTHPB-text-embedding-3-small`
- **ID**: stable, deterministic (e.g., `talk_{talk_id}_chunk_{chunk_index}` or hash-based)
- **Metadata** (minimum):
  - `talk_id` (string)
  - `title` (string)
  - `speaker_1` (string, optional but useful)
  - `chunk_index` (int)
  - `chunk_text` (string) — if Pinecone metadata size limits are tight, store a trimmed chunk and keep full chunk text elsewhere
  - optional: `topics`, `url`, `published_date`, etc.

## Chunking Strategy (choose hyperparameters)
### Initial (safe) defaults to start with
- **chunk_size**: ~900–1200 tokens (must be ≤ 2048)
- **overlap_ratio**: 0.15–0.25 (must be ≤ 0.3)
- **top_k**: 6–10 (must be ≤ 30)

### Implementation details
- Tokenize with a model-appropriate tokenizer (or approximate via chars if you document it) and keep chunk boundaries stable.
- Chunk **only the transcript** (plus minimal metadata in the prompt) to reduce cost.
- Store chunk text in metadata to support returning the `context` array in the API response.

## Budget Plan ($5 cap)
- Start with a **small subset** (e.g., 50–100 talks) while tuning chunking + prompt format.
- Implement a **local ingestion cache** keyed by `(talk_id, chunk_index, chunk_hash, embedding_model)` to avoid re-embedding unchanged chunks.
- Only run full ingestion once hyperparameters and metadata choices are stable.
- Keep `top_k` modest; retrieving too many chunks increases LLM input tokens and is considered inefficient.

## Required System Prompt (must include)
When calling `RPRTHPB-gpt-5-mini`, include this (or extremely similar) system section:

> You are a TED Talk assistant that answers questions strictly and only based on the TED dataset context provided to you (metadata and transcript passages). You must not use any external knowledge, the open internet, or information that is not explicitly contained in the retrieved context. If the answer cannot be determined from the provided context, respond: “I don’t know based on the provided TED data.” Always explain your answer using the given context, quoting or paraphrasing the relevant transcript or metadata when helpful.

Add a small amount of extra instruction as needed (formatting, “list exactly 3 titles”, etc.) **without weakening** the constraints.

## Retrieval + Generation Logic (per required question types)
### 1) Precise Fact Retrieval
- Retrieval: standard semantic search; prefer fewer, higher-signal chunks.
- Generation: answer with **title + speaker** (or requested fields) and cite supporting snippets.

### 2) Multi-Result Topic Listing (exactly 3, distinct talks)
- Retrieval: fetch `top_k` chunks, then **group by `talk_id`** and pick top 3 distinct talks.
- Generation: instruct the model to output **exactly 3 talk titles** (and nothing else if required).

### 3) Key Idea Summary Extraction
- Retrieval: get top chunks for the best-matching talk; optionally pull 2–3 chunks from the same talk for richer summary.
- Generation: produce a short summary and keep it grounded in retrieved passages.

### 4) Recommendation with Evidence-Based Justification
- Retrieval: select the best-matching talk; optionally include a few supporting chunks.
- Generation: recommend one talk and justify using retrieved content (quotes/paraphrases).

## API Contract (must match assignment)
### `POST /api/prompt`
**Input JSON**
```json
{ "question": "Your natural language question here" }
```

**Output JSON**
- `response`: final model answer
- `context`: array of retrieved chunks (each with `talk_id`, `title`, `chunk`, `score`)
- `Augmented_prompt`: the exact prompt sent to the chat model:
  - `System`: system prompt used
  - `User`: user prompt used

Example shape (field names must match):
```json
{
  "response": "…",
  "context": [
    { "talk_id": "1234", "title": "…", "chunk": "…", "score": 0.1234 }
  ],
  "Augmented_prompt": {
    "System": "…",
    "User": "…"
  }
}
```

### `GET /api/stats`
Return **strict JSON** with **exact field names**:
```json
{ "chunk_size": 1024, "overlap_ratio": 0.2, "top_k": 5 }
```
If you change hyperparameters later, this must always reflect the current values.

## Repo Structure (recommended)
- `src/`
  - `app/api/prompt/route.ts` (or equivalent) — query pipeline
  - `app/api/stats/route.ts` — returns chosen hyperparameters
  - `lib/rag/` — chunking, retrieval, prompt building
  - `lib/pinecone/` — Pinecone client + index helpers
  - `lib/models/` — embedding + chat model wrappers (RPRTHPB-*)
- `scripts/`
  - `ingest.ts` (or `ingest.py`) — one-time/iterative ingestion into Pinecone
- `data/`
  - `embedding_cache.json` (local-only; **do not** commit secrets)
- `.env.local` (local), Vercel env vars (prod)

## Environment Variables (expected)
- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME`
- `PINECONE_ENVIRONMENT` (if required by SDK)
- `RPRTHPB_API_KEY` / model provider credentials (as applicable)

## Validation Plan (before full-scale ingestion)
- Write a small set of manual test questions matching the 4 categories.
- Verify:
  - The assistant never answers from “common knowledge” without context.
  - `Multi‑Result Topic Listing` returns **3 distinct talks**.
  - When retrieval is irrelevant/empty, the response is exactly: **“I don’t know based on the provided TED data.”**
  - `POST /api/prompt` and `GET /api/stats` match the required JSON shapes.

## Deployment Plan (Vercel)
- Build and run locally, then deploy to Vercel.
- Configure env vars in Vercel project settings.
- Confirm public endpoints:
  - `POST https://{your-url}/api/prompt`
  - `GET https://{your-url}/api/stats`
- Keep the Pinecone index active through grading.

## Milestones
1. **MVP retrieval**: ingestion script for small subset + basic Pinecone query.
2. **API correctness**: implement both endpoints with correct JSON shapes.
3. **Grounding + refusal**: enforce system prompt and “I don’t know…” behavior.
4. **Support all 4 query types**: add grouping logic for “3 distinct talks”, summarization and recommendation prompting.
5. **Scale to full dataset**: one-time full ingestion with caching to stay within budget.
6. **Deploy**: Vercel live URL + final smoke tests.


