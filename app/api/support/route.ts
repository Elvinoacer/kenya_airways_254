import { NextResponse } from "next/server";
import security from "@/lib/security";
import support from "@/lib/support";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, subject, message, context } = body || {};
    if (!message || !email) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const { ticketRef } = await support.createTicket({
      name,
      email,
      subject,
      message,
      context
    });

    // also log an audit entry
    await security.logAudit(
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
