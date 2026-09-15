import { NextRequest, NextResponse } from "next/server";
export function proxy(req: NextRequest) {
  const origin = req.headers.get("origin");
  const allowed = (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(",");
  if (origin && !allowed.includes(origin) && origin !== req.nextUrl.origin) return NextResponse.json({error:"Origin not allowed"},{status:403});
  const response = req.method === "OPTIONS" ? new NextResponse(null,{status:204}) : NextResponse.next();
  if (origin && allowed.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin",origin);
    response.headers.set("Access-Control-Allow-Methods","GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers","Content-Type");
    response.headers.set("Vary","Origin");
  }
  response.headers.set("Cache-Control","no-store");
  return response;
}
export const config = { matcher: "/api/:path*" };
