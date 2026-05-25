import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";

export async function GET() {
  const rows = query.all(`SELECT * FROM aircraft ORDER BY created_at DESC`);
  return NextResponse.json(rows);
}
