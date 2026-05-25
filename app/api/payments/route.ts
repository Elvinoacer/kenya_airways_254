import { NextResponse } from "next/server";
import {
  createPayment,
  startMpesaPayment,
  startAirtelPayment,
  startCardPayment,
  createInvoiceForBooking,
} from "../../../lib/payments";
import { query } from "../../..//lib/db";

export async function POST(request: Request) {
  const body: any = await request.json().catch(() => ({}));
  const { bookingId, amount, currency, provider, metadata } = body;
  if (!amount || !provider)
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const payment: any = createPayment({
    bookingId,
    amount,
    currency,
    provider,
    metadata,
  });

  // attach provider_payment_id placeholder for webhook matching for simulated flows
  query.run(`UPDATE payments SET provider_payment_id = ? WHERE id = ?`, [
    `${provider}-${payment.id}`,
    payment.id,
  ]);

  // optionally create invoice
  if (bookingId) createInvoiceForBooking(bookingId, amount, currency || "KES");

  // provider-specific kickoff
  if (provider === "MPESA") {
    const phone = metadata?.phone;
    const res = await startMpesaPayment(payment.id, phone);
    return NextResponse.json(
      { payment, providerInstruction: res },
      { status: 201 },
    );
  }
  if (provider === "AIRTEL") {
    const phone = metadata?.phone;
    const res = await startAirtelPayment(payment.id, phone);
    return NextResponse.json(
      { payment, providerInstruction: res },
      { status: 201 },
    );
  }
  if (provider === "CARD") {
    const res = await startCardPayment(payment.id, metadata?.card);
    return NextResponse.json(
      { payment, providerInstruction: res },
      { status: 201 },
    );
  }

  return NextResponse.json({ payment }, { status: 201 });
}

export async function GET() {
  const rows = query.all(
    `SELECT * FROM payments ORDER BY created_at DESC LIMIT 200`,
  );
  return NextResponse.json({ payments: rows });
}
