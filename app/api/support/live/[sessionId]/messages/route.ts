import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import support from "@/lib/support";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const p = await params;
  const messages = support.listLiveMessages(p.sessionId);
  return NextResponse.json({ messages });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const p = await params;
    const body = await request.json();
    const { sender, message, metadata } = body || {};
    if (!sender || !message)
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    const res = support.addLiveMessage(
      p.sessionId,
      sender,
      message,
      metadata || {},
    );
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
