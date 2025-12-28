import fs from "node:fs";
import path from "node:path";

type CacheEntry = { key: string; embedding: number[] };

export function loadJsonlEmbeddingCache(cachePath: string): Map<string, number[]> {
  const map = new Map<string, number[]>();
  if (!fs.existsSync(cachePath)) return map;

  const content = fs.readFileSync(cachePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as CacheEntry;
      if (parsed?.key && Array.isArray(parsed.embedding)) map.set(parsed.key, parsed.embedding);
    } catch {
      // ignore malformed lines
    }
  }
  return map;
}

export function appendJsonlEmbeddingCache(cachePath: string, entry: CacheEntry) {
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.appendFileSync(cachePath, `${JSON.stringify(entry)}\n`, "utf8");
}


