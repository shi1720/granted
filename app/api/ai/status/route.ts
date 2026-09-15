import { NextResponse } from "next/server";
import { MODEL, hasAnthropicKey } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

/** Tells the UI whether live Claude analysis is available or demo mode is active. */
export async function GET() {
  const aiEnabled = hasAnthropicKey();
  return NextResponse.json({
    aiEnabled,
    model: aiEnabled ? MODEL : null,
  });
}
