import { NextResponse } from "next/server";
import {
  createPayment,
  startMpesaPayment,
  startAirtelPayment,
  startCardPayment,
  createInvoiceForBooking,
} from "../../../lib/payments";
import { prisma } from "../../../lib/prisma";

export async function POST(request: Request) {
  const body: any = await request.json().catch(() => ({}));
  const { bookingId, amount, currency, provider, metadata } = body;
  if (!amount || !provider)
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const payment: any = await createPayment({
    bookingId,
    amount,
    currency,
    provider,
    metadata,
  });

  // attach provider_payment_id placeholder for webhook matching for simulated flows
  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerPaymentId: `${provider}-${payment.id}` }
  });

  // optionally create invoice
  if (bookingId) await createInvoiceForBooking(bookingId, amount, currency || "KES");

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
  const rows = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 200
  });
  return NextResponse.json({ payments: rows });
}
