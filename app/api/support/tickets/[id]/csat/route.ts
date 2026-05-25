import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import support from "@/lib/support";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const p = await params;
    const body = await request.json();
    const { score, feedback } = body || {};
    if (typeof score !== "number")
      return NextResponse.json({ error: "invalid_score" }, { status: 400 });
    const res = support.addCsat(p.id, score, feedback || null);
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
