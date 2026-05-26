import { NextResponse } from "next/server";
import support from "@/lib/support";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") || 50);
  const cursor = url.searchParams.get("cursor") || undefined;
  let tickets;
  if (cursor) {
    tickets = await support.listTicketsCursor(limit, cursor);
  } else {
    tickets = await support.listTickets(limit, 0);
  }
  // compute nextCursor if there are results
  const tks = tickets as any[];
  const nextCursor =
    tks.length > 0 ? support.makeCursor(tks[tks.length - 1]) : null;
  return NextResponse.json({ tickets: tks, nextCursor });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, subject, message, context } = body || {};
    if (!email || !message)
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    const created = await support.createTicket({
      name,
      email,
      subject,
      message,
      context,
    });
    return NextResponse.json({ ok: true, ...created });
  } catch (e) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
