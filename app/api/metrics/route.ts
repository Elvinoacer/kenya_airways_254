import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = body.url || "";
    const payload = JSON.stringify(body.entries || body);
    const id = String(Date.now()) + Math.random().toString(36).slice(2);
    query.run(
      `INSERT INTO metrics_rum (id, url, payload_json) VALUES (?, ?, ?)`,
      [id, url, payload],
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}
