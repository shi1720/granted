import { NextRequest, NextResponse } from "next/server";
import { friendlyAiError, hasAnthropicKey } from "@/lib/ai/client";
import { draftProposal } from "@/lib/ai/draft";
import { DEMO_GRANTS, FEATURED_DEMO_GRANT_ID } from "@/lib/demo";
import { demoDraftEvents } from "@/lib/demo-draft";
import { fetchGrantDetail } from "@/lib/grantsgov";
import { OrgProfileZ } from "@/lib/validate";
import type { DraftEvent } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

/**
 * The drafting pipeline (Strategist → Writer → Reviewer → Reviser), streamed
 * as server-sent events. Demo mode replays a pre-generated run for the
 * featured opportunity so the full experience works without an API key.
 */
export async function POST(req: NextRequest) {
  let grantId: string;
  let org: ReturnType<typeof OrgProfileZ.parse>;
  let fit: unknown;
  try {
    const body = await req.json();
    grantId = String(body.grantId ?? "");
    org = OrgProfileZ.parse(body.org);
    fit = body.fit ?? null;
  } catch {
    return NextResponse.json(
      { error: "Invalid request — send a grantId and a complete org profile." },
      { status: 400 },
    );
  }

  const live = hasAnthropicKey();

  if (!live && grantId !== FEATURED_DEMO_GRANT_ID) {
    return NextResponse.json(
      {
        error:
          "Drafting for any grant needs a Claude API key (ANTHROPIC_API_KEY in .env.local). Without one, try the featured demo opportunity to see the full pipeline.",
        code: "need_key",
        demoGrantId: FEATURED_DEMO_GRANT_ID,
      },
      { status: 409 },
    );
  }

  let events: AsyncGenerator<DraftEvent>;
  if (live) {
    let grant;
    try {
      grant = await fetchGrantDetail(grantId);
    } catch {
      grant = DEMO_GRANTS.find((g) => g.id === grantId);
      if (!grant) {
        return NextResponse.json(
          { error: "Couldn't load this opportunity from Grants.gov." },
          { status: 502 },
        );
      }
    }
    // fit is advisory context for the Strategist; shape-checked loosely.
    const fitReport =
      fit && typeof fit === "object" && "verdict" in (fit as object)
        ? (fit as Parameters<typeof draftProposal>[0]["fit"])
        : null;
    events = draftProposal({ grant, org, fit: fitReport });
  } else {
    events = demoDraftEvents();
  }

  const encoder = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: DraftEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          // Client went away mid-stream; stop producing.
          closed = true;
        }
      };
      try {
        for await (const event of events) {
          if (closed) break;
          send(event);
        }
      } catch (err) {
        console.error("Draft pipeline error:", err);
        send({ type: "error", message: friendlyAiError(err) });
      } finally {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {
            // Already closed by cancel(); nothing to do.
          }
        }
      }
    },
    cancel() {
      // Client disconnected — stop the producer loop above.
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
