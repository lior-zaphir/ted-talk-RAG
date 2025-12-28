import type { RetrievedChunk } from "./retrieval";

export function pickTopDistinctTalks(args: { chunks: RetrievedChunk[]; limit: number }): RetrievedChunk[] {
  const out: RetrievedChunk[] = [];
  const seen = new Set<string>();
  for (const c of args.chunks) {
    if (seen.has(c.talk_id)) continue;
    seen.add(c.talk_id);
    out.push(c);
    if (out.length >= args.limit) break;
  }
  return out;
}

export function pickTopChunksFromSingleTalk(args: { chunks: RetrievedChunk[]; talkId: string; limit: number }) {
  return args.chunks.filter((c) => c.talk_id === args.talkId).slice(0, args.limit);
}

export function bestTalkId(chunks: RetrievedChunk[]): string | null {
  return chunks.length ? chunks[0]!.talk_id : null;
}


