import { NextResponse } from "next/server";
import support from "@/lib/support";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ticketId, visitorId } = body || {};
    const session = support.createLiveSession(ticketId, visitorId);
    return NextResponse.json({ ok: true, ...session });
  } catch (e) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
