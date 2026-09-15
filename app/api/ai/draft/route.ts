import { eligibilityVerdict } from "@/lib/fit";
import { guardAiRequest } from "@/lib/request-guard";
import { NextRequest, NextResponse } from "next/server";
import { friendlyAiError, hasAiKey } from "@/lib/ai/client";
import { draftProposal } from "@/lib/ai/draft";
import { DEMO_GRANTS, DEMO_ORG, FEATURED_DEMO_GRANT_ID } from "@/lib/demo";
import { demoDraftEvents } from "@/lib/demo-draft";
import { fetchGrantDetail } from "@/lib/grantsgov";
import { z } from "zod";
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
  const denied = guardAiRequest(req);
  if (denied) return denied;
  let grantId: string;
  let org: ReturnType<typeof OrgProfileZ.parse>;
  let fit: unknown;
  try {
    const body = await req.json();
    grantId = z.string().regex(/^\d+$/).parse(String(body.grantId ?? ""));
    org = OrgProfileZ.parse(body.org);
    fit = body.fit ? z.object({verdict: z.string().max(3000), alignment: z.object({strengths: z.array(z.string().max(1000)).max(8), gaps: z.array(z.string().max(1000)).max(8)}), winStrategy: z.array(z.string().max(1000)).max(8)}).passthrough().parse(body.fit) : null;
  } catch {
    return NextResponse.json(
      { error: "Invalid request ; send a grantId and a complete org profile." },
      { status: 400 },
    );
  }

  const live = hasAiKey();

  if (!live && (grantId !== FEATURED_DEMO_GRANT_ID || org.name !== DEMO_ORG.name)) {
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

  // Aborting this controller stops in-flight Claude calls when the client
  // disconnects, so a closed tab never keeps burning tokens.
  const upstream = new AbortController();
  req.signal.addEventListener("abort", () => upstream.abort(), { once: true });

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
    if (eligibilityVerdict(grant, org).verdict === "ineligible") return NextResponse.json({error:"Your organization does not match this opportunity’s applicant requirements. Choose another grant before drafting."},{status:409});
    // fit is advisory context for the Strategist; shape-checked loosely.
    const fitReport =
      fit && typeof fit === "object" && "verdict" in (fit as object)
        ? (fit as Parameters<typeof draftProposal>[0]["fit"])
        : null;
    events = draftProposal({ grant, org, fit: fitReport, signal: upstream.signal });
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
          upstream.abort();
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
      // Client disconnected ; stop the producer loop and abort model calls.
      closed = true;
      upstream.abort();
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
