import path from "node:path";
import dotenv from "dotenv";
import { retrieveTopK } from "../src/lib/rag/retrieval";

// Load repo-root .env (so you can keep a single env file at /Agents_Project/.env)
dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

async function main() {
  const question =
    argValue("--q") ??
    process.env.QUESTION ??
    "Find a TED talk that discusses overcoming fear or anxiety. Provide the title and speaker.";

  const topK = Number(argValue("--topk") ?? process.env.TOP_K ?? "8");

  const results = await retrieveTopK({ question, topK });
  console.log(JSON.stringify({ question, topK, results }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


