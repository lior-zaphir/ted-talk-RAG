import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

function summarize(name: string) {
  const v = process.env[name];
  if (!v) return { name, set: false };
  return {
    name,
    set: true,
    length: v.length,
    hasLeadingOrTrailingSpace: v.trim().length !== v.length,
  };
}

const resolvedBaseURL =
  process.env.LLMOD_BASE_URL ??
  (process.env.LLMOD_API_KEY ? "https://api.llmod.ai/v1" : undefined) ??
  process.env.RPRTHPB_BASE_URL ??
  "(default openai sdk)";

console.log(
  JSON.stringify(
    {
      env: [
        summarize("PINECONE_API_KEY"),
        summarize("PINECONE_INDEX_NAME"),
        summarize("PINECONE_NAMESPACE"),
        summarize("LLMOD_API_KEY"),
        summarize("LLMOD_BASE_URL"),
        summarize("RPRTHPB_API_KEY"),
        summarize("RPRTHPB_BASE_URL"),
      ],
      resolvedBaseURL,
      note:
        "If Pinecone rejects the API key, verify the key in Pinecone console (API keys) and ensure the index exists in the same project/org. Also remove spaces around '=' in .env (KEY=VALUE).",
    },
    null,
    2,
  ),
);


