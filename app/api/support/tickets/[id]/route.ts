import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import support from "@/lib/support";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const p = await params;
  const ticket = support.getTicket(p.id);
  if (!ticket)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  const events = support.listEvents(p.id);
  return NextResponse.json({ ticket, events });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const p = await params;
    const body = await request.json();
    const res = support.updateTicket(p.id, body || {});
    return NextResponse.json({ ok: true, res });
  } catch (e) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
