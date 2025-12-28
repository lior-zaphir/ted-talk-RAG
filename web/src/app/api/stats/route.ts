import { NextResponse } from "next/server";
import { RAG_CONFIG } from "@/lib/rag/config";

export async function GET() {
  // Strict JSON shape + field names required by the assignment.
  return NextResponse.json({
    chunk_size: RAG_CONFIG.chunk_size,
    overlap_ratio: RAG_CONFIG.overlap_ratio,
    top_k: RAG_CONFIG.top_k,
  });
}


