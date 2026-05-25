import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// Simple batching endpoint: accepts array of ids and returns tickets in one query
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ids: string[] = body.ids || [];
    if (!Array.isArray(ids) || ids.length === 0)
      return NextResponse.json({ tickets: [] });
    const placeholders = ids.map(() => "?").join(",");
    const rows = query.all(
      `SELECT * FROM support_tickets WHERE id IN (${placeholders})`,
      ids,
    );
    return NextResponse.json({ tickets: rows });
  } catch (e) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}
