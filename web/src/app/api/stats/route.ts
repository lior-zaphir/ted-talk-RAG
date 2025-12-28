import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Strict JSON shape + field names required by the assignment.
    // Inline constants here to avoid any import-time failures on Vercel.
    return NextResponse.json({
      chunk_size: 1024,
      overlap_ratio: 0.2,
      top_k: 8,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal Server Error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}


