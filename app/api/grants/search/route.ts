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
    body = await req.json();
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
    const hits = DEMO_GRANTS.filter(
      (g) => !kw || `${g.title} ${g.synopsis}`.toLowerCase().includes(kw),
    ).map(({ id, number, title, agency, agencyCode, openDate, closeDate, status, cfdaList }) => ({
      id, number, title, agency, agencyCode, openDate, closeDate, status, cfdaList,
    }));
    return NextResponse.json({ hits, hitCount: hits.length, source: "snapshot" });
  }
}
