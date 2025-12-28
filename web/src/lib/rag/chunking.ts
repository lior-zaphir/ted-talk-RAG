const APPROX_CHARS_PER_TOKEN = 4;

export function chunkTextByApproxTokens(args: {
  text: string;
  chunkSizeTokens: number;
  overlapRatio: number; // 0..0.3
}): string[] {
  const { text } = args;
  const chunkChars = Math.max(200, Math.floor(args.chunkSizeTokens * APPROX_CHARS_PER_TOKEN));
  const overlapChars = Math.floor(chunkChars * Math.min(Math.max(args.overlapRatio, 0), 0.3));
  const step = Math.max(1, chunkChars - overlapChars);

  const cleaned = (text ?? "").replace(/\s+/g, " ").trim();
  if (!cleaned) return [];

  const out: string[] = [];
  for (let start = 0; start < cleaned.length; start += step) {
    const end = Math.min(cleaned.length, start + chunkChars);
    const chunk = cleaned.slice(start, end).trim();
    if (chunk) out.push(chunk);
    if (end >= cleaned.length) break;
  }
  return out;
}


