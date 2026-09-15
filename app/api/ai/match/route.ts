import { guardAiRequest } from "@/lib/request-guard";
import { NextRequest, NextResponse } from "next/server";
import { friendlyAiError, hasAiKey } from "@/lib/ai/client";
import { analyzeFit } from "@/lib/ai/match";
import { DEMO_GRANTS } from "@/lib/demo";
import { heuristicFitReport } from "@/lib/fit";
import { fetchGrantDetail } from "@/lib/grantsgov";
import { OrgProfileZ } from "@/lib/validate";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * The Analyst agent's go/no-go brief. With ANTHROPIC_API_KEY: Claude.
 * Without: the transparent heuristic engine (labeled in the report).
 */
export async function POST(req: NextRequest) {
  const denied = guardAiRequest(req);
  if (denied) return denied;
  let grantId: string;
  let org: ReturnType<typeof OrgProfileZ.parse>;
  try {
    const body = await req.json();
    grantId = String(body.grantId ?? "");
    org = OrgProfileZ.parse(body.org);
  } catch {
    return NextResponse.json(
      { error: "Invalid request ; send a grantId and a complete org profile." },
      { status: 400 },
    );
  }
  if (!/^\d+$/.test(grantId)) {
    return NextResponse.json({ error: "Invalid opportunity id." }, { status: 400 });
  }

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

  if (!hasAiKey()) {
    return NextResponse.json({ report: heuristicFitReport(grant, org) });
  }

  try {
    const report = await analyzeFit(grant, org);
    return NextResponse.json({ report });
  } catch (err) {
    console.error("Fit analysis failed, falling back to heuristic:", err);
    return NextResponse.json({
      report: heuristicFitReport(grant, org),
      warning: friendlyAiError(err),
    });
  }
}
