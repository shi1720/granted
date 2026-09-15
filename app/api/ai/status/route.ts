import { NextResponse } from "next/server";
import { MODEL, hasAiKey } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

/** Tells the UI whether live Claude analysis is available or demo mode is active. */
export async function GET() {
  const aiEnabled = hasAiKey();
  return NextResponse.json({
    aiEnabled,
    apiBase: process.env.PUBLIC_API_BASE || "",
    model: aiEnabled ? MODEL : null,
  });
}
