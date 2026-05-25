import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  const metrics = query.all(
    `SELECT id, url, payload_json, received_at FROM metrics_rum ORDER BY received_at DESC LIMIT 1000`,
  );
  return NextResponse.json({ metrics });
}
