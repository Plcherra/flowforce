import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "flowforce-web",
      runtime: "nextjs",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
