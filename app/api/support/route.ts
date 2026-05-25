import { NextResponse } from "next/server";
import security from "@/lib/security";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, subject, message, context } = body || {};
    if (!message || !email) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    // persist ticket
    const ticketRef = `TKT-${Date.now().toString(36).toUpperCase()}`;
    query.run(
      `INSERT INTO support_tickets (id, ticket_ref, name, email, subject, message, context_json) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        ticketRef + "-" + Math.random().toString(36).slice(2),
        ticketRef,
        name || null,
        email,
        subject || null,
        message,
        JSON.stringify(context || {}),
      ],
    );

    // also log an audit entry
    security.logAudit(
      null,
      null,
      "support_message_created",
      "support",
      undefined,
      { ticketRef, name, email, subject },
    );

    return NextResponse.json({ ok: true, ticketRef });
  } catch (e: any) {
    console.error("support submit error", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
