import path from "node:path";
import dotenv from "dotenv";
import { embedText } from "../src/lib/models/rprthpb";

dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

async function main() {
  const v = await embedText("hello");
  console.log(JSON.stringify({ embedding_length: v.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


