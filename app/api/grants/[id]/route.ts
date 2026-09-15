import { NextRequest, NextResponse } from "next/server";
import { fetchGrantDetail } from "@/lib/grantsgov";
import { DEMO_GRANTS } from "@/lib/demo";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid opportunity id." }, { status: 400 });
  }

  try {
    const grant = await fetchGrantDetail(id);
    return NextResponse.json({ grant, source: "live" });
  } catch (err) {
    const snapshot = DEMO_GRANTS.find((g) => g.id === id);
    if (snapshot) return NextResponse.json({ grant: snapshot, source: "snapshot" });
    console.error("fetchOpportunity failed:", err);
    return NextResponse.json(
      { error: "Couldn't load this opportunity from Grants.gov. Try again shortly." },
      { status: 502 },
    );
  }
}
