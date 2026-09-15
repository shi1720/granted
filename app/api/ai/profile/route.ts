import { NextRequest, NextResponse } from "next/server";
import { friendlyAiError, hasAnthropicKey } from "@/lib/ai/client";
import { extractProfile } from "@/lib/ai/profile";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Build a structured org profile from freeform text via the extractor agent. */
export async function POST(req: NextRequest) {
  if (!hasAnthropicKey()) {
    return NextResponse.json(
      {
        error:
          "Profile extraction needs a Claude API key. Add ANTHROPIC_API_KEY to .env.local — or load the demo organization to explore.",
        code: "need_key",
      },
      { status: 409 },
    );
  }

  let text: string;
  try {
    const body = await req.json();
    text = String(body.text ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (text.trim().length < 80) {
    return NextResponse.json(
      { error: "Paste at least a few sentences about the organization." },
      { status: 400 },
    );
  }

  try {
    const profile = await extractProfile(text.slice(0, 20_000));
    return NextResponse.json({ profile });
  } catch (err) {
    console.error("Profile extraction failed:", err);
    return NextResponse.json({ error: friendlyAiError(err) }, { status: 500 });
  }
}
