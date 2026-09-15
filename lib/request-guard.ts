import { NextRequest, NextResponse } from "next/server";
// Per-instance limits are backed by a hard deployment instance cap. No profiles are logged.
const buckets = new Map<string, {count: number; expires: number}>();
export function guardAiRequest(req: NextRequest) {
  const origin = req.headers.get("origin");
  const allowed = (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(",");
  if (origin && !allowed.includes(origin) && origin !== req.nextUrl.origin) return NextResponse.json({error:"This origin is not allowed."},{status:403});
  if (Number(req.headers.get("content-length") || 0) > 50_000) return NextResponse.json({error:"Request too large."},{status:413});
  const now = Date.now();
  for (const [key,value] of buckets) if(value.expires < now) buckets.delete(key);
  const ip = req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "local";
  const id = `${ip}:${req.nextUrl.pathname}`;
  const b = buckets.get(id) || {count:0, expires:now+3_600_000};
  const limit = req.nextUrl.pathname.endsWith("draft") ? 6 : 35;
  if (++b.count > limit) return NextResponse.json({error:"This demo's hourly limit has been reached. Please try again later."},{status:429,headers:{"Retry-After":"3600"}});
  buckets.set(id,b);
  const total = buckets.get("global") || {count:0,expires:now+3_600_000};
  if (++total.count > 200) return NextResponse.json({error:"The public demo is at capacity. Please try again later."},{status:429});
  buckets.set("global",total);
  return null;
}
