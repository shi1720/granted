import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { searchGrants } from "@/lib/grantsgov";
import { DEMO_GRANTS } from "@/lib/demo";

export const dynamic = "force-dynamic";

/**
 * Live Grants.gov search (no key required). Falls back to the bundled
 * snapshot if the upstream API is unreachable, so the app never dead-ends.
 */
export async function POST(req: NextRequest) {
  let body: {
    keyword?: string;
    fundingCategories?: string[];
    eligibilities?: string[];
    rows?: number;
    startRecordNum?: number;
  };
  try {
    body = z.object({keyword: z.string().max(300).optional(), fundingCategories: z.array(z.string().max(5)).max(20).optional(), eligibilities: z.array(z.string().max(5)).max(25).optional(), rows: z.number().int().min(1).max(50).optional(), startRecordNum: z.number().int().min(0).max(10000).optional()}).parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const { hits, hitCount } = await searchGrants({
      keyword: body.keyword,
      fundingCategories: body.fundingCategories,
      eligibilities: body.eligibilities,
      rows: Math.min(body.rows ?? 20, 50),
      startRecordNum: body.startRecordNum ?? 0,
    });
    return NextResponse.json({ hits, hitCount, source: "live" });
  } catch (err) {
    console.error("Grants.gov search failed, serving snapshot:", err);
    const kw = (body.keyword ?? "").toLowerCase();
    const matching = DEMO_GRANTS.filter(
      (g) => (!kw || `${g.title} ${g.synopsis}`.toLowerCase().includes(kw)) && (!body.fundingCategories?.length || body.fundingCategories.some(c => g.fundingCategories.includes(c))) && (!body.eligibilities?.length || body.eligibilities.some(c => g.eligibilityCodes.includes(c))),
    );
    const hits = matching.slice(body.startRecordNum ?? 0, (body.startRecordNum ?? 0) + (body.rows ?? 20)).map(({ id, number, title, agency, agencyCode, openDate, closeDate, status, cfdaList }) => ({
      id, number, title, agency, agencyCode, openDate, closeDate, status, cfdaList,
    }));
    return NextResponse.json({ hits, hitCount: matching.length, source: "snapshot" });
  }
}
