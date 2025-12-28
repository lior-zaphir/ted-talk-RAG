import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import type { PineconeRecord, RecordMetadata } from "@pinecone-database/pinecone";
import dotenv from "dotenv";

// Load repo-root .env (so you can keep a single env file at /Agents_Project/.env)
dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

import { getPineconeIndex } from "../src/lib/pinecone/client";
import { RAG_CONFIG } from "../src/lib/rag/config";
import { chunkTextByApproxTokens } from "../src/lib/rag/chunking";
import { appendJsonlEmbeddingCache, loadJsonlEmbeddingCache } from "../src/lib/rag/cache";
import { embedText } from "../src/lib/models/rprthpb";

type TedRow = {
  talk_id: string;
  title: string;
  speaker_1?: string;
  topics?: string;
  url?: string;
  transcript?: string;
};

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function sha1(s: string): string {
  return crypto.createHash("sha1").update(s).digest("hex");
}

async function main() {
  const csvPath =
    argValue("--csv") ??
    process.env.TED_CSV_PATH ??
    path.resolve(process.cwd(), "..", "ted_talks_en.csv");

  const offsetTalks = Number(argValue("--offset") ?? process.env.INGEST_OFFSET_TALKS ?? "0");
  const limitTalks = Number(argValue("--limit") ?? process.env.INGEST_LIMIT_TALKS ?? "100");
  const dryRun = hasFlag("--dry-run") || process.env.DRY_RUN === "1";
  const noEmbed = hasFlag("--no-embed") || process.env.NO_EMBED === "1";
  const verbose = hasFlag("--verbose") || process.env.VERBOSE === "1";
  const namespace = argValue("--namespace") ?? process.env.PINECONE_NAMESPACE ?? "ted";

  const cachePath =
    argValue("--cache") ??
    process.env.EMBED_CACHE_PATH ??
    path.resolve(process.cwd(), ".rag_cache", "embeddings.jsonl");

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found at ${csvPath}. Pass --csv <path> or set TED_CSV_PATH.`);
  }

  console.log(`Reading CSV: ${csvPath}`);
  const csvRaw = fs.readFileSync(csvPath, "utf8");
  const records = parse(csvRaw, { columns: true, skip_empty_lines: true }) as TedRow[];

  const start = Math.max(0, offsetTalks);
  const end = start + Math.max(0, limitTalks);
  const subset = records.slice(start, end);
  console.log(`Talks: ${records.length} total, ingesting ${subset.length} (offset=${start}, limit=${limitTalks})`);
  console.log(`RAG config: ${JSON.stringify(RAG_CONFIG)}`);
  console.log(`Namespace: ${namespace}`);
  console.log(`Cache: ${cachePath}`);
  console.log(`Dry-run: ${dryRun}`);
  console.log(`No-embed: ${noEmbed}`);
  console.log(`Verbose: ${verbose}`);

  const cache = loadJsonlEmbeddingCache(cachePath);
  console.log(`Cache entries loaded: ${cache.size}`);

  const index = dryRun ? null : getPineconeIndex().namespace(namespace);

  let totalChunks = 0;
  let embeddedNow = 0;
  let upserted = 0;

  const batch: PineconeRecord<RecordMetadata>[] = [];
  const UPSERT_BATCH = 100;

  for (let talkIdx = 0; talkIdx < subset.length; talkIdx++) {
    const row = subset[talkIdx]!;
    const talkId = String(row.talk_id);
    const title = String(row.title ?? "");
    const speaker = row.speaker_1 ? String(row.speaker_1) : "";
    const transcript = row.transcript ? String(row.transcript) : "";
    if (!talkId || !title || !transcript) continue;

    if (verbose) {
      console.log(
        `[talk ${talkIdx + 1}/${subset.length}] talk_id=${talkId} title="${title}"${speaker ? ` speaker_1="${speaker}"` : ""}`,
      );
    }

    const chunks = chunkTextByApproxTokens({
      text: transcript,
      chunkSizeTokens: RAG_CONFIG.chunk_size,
      overlapRatio: RAG_CONFIG.overlap_ratio,
    });

    if (verbose) console.log(`  - chunks: ${chunks.length}`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      const key = `${talkId}:${i}:${sha1(chunk)}:${RAG_CONFIG.chunk_size}:${RAG_CONFIG.overlap_ratio}`;
      let embedding = cache.get(key);
      if (!embedding && !noEmbed) {
        embedding = await embedText(chunk);
        cache.set(key, embedding);
        appendJsonlEmbeddingCache(cachePath, { key, embedding });
        embeddedNow++;
        if (verbose && embeddedNow % 25 === 0) {
          console.log(`  - embedded_new: ${embeddedNow} (latest talk_id=${talkId} chunk_index=${i})`);
        }
      }

      if (!embedding) {
        // Allow pipeline testing (parsing/chunking/record shaping) without credentials.
        // This is NOT valid for real ingestion: Pinecone requires real embeddings.
        embedding = new Array(1536).fill(0);
      }

      const id = `talk_${talkId}_chunk_${i}`;
      const metadata: RecordMetadata = {
        talk_id: talkId,
        title,
        speaker_1: speaker,
        chunk_index: i,
        chunk,
      };
      batch.push({
        id,
        values: embedding,
        metadata,
      });
      totalChunks++;

      if (batch.length >= UPSERT_BATCH) {
        if (!dryRun) {
          await index!.upsert(batch);
          upserted += batch.length;
          if (verbose) {
            console.log(`  - upserted batch: ${batch.length} (total_upserted=${upserted})`);
          }
        }
        batch.length = 0;
      }
    }
  }

  if (batch.length) {
    if (!dryRun) {
      await index!.upsert(batch);
      upserted += batch.length;
      if (verbose) {
        console.log(`  - upserted final batch: ${batch.length} (total_upserted=${upserted})`);
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        talks_ingested: subset.length,
        offset: start,
        limit: limitTalks,
        chunks_total: totalChunks,
        embeddings_new: embeddedNow,
        upserted: dryRun ? 0 : upserted,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


