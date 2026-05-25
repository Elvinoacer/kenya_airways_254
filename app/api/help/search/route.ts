import { NextResponse } from "next/server";
import { searchHelp } from "@/lib/help";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const results = searchHelp(q);
  return NextResponse.json({ results });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const q = body.q || "";
  const results = searchHelp(q);
  return NextResponse.json({ results });
}
