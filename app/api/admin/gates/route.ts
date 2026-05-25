import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";

export async function GET() {
  const rows = query.all(`SELECT * FROM gates ORDER BY gate_code`);
  return NextResponse.json(rows);
}
