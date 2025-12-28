import { NextResponse } from "next/server";
import { RAG_CONFIG } from "../../../lib/rag/config";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Strict JSON shape + field names required by the assignment.
    return NextResponse.json({
      chunk_size: RAG_CONFIG.chunk_size,
      overlap_ratio: RAG_CONFIG.overlap_ratio,
      top_k: RAG_CONFIG.top_k,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal Server Error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}


