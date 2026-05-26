import { NextResponse } from "next/server";
import { createRefundRequest, listRefunds } from "../../../lib/refunds";
import { prisma } from "../../../lib/prisma";

async function resolveAmount(body: any) {
  if (typeof body.amount === "number") return body.amount;
  const paymentId = body.paymentId;
  if (paymentId) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });
    if (payment) return Number(payment.amount || 0);
  }
  const bookingId = body.bookingId;
  if (bookingId) {
    const payment = await prisma.payment.findFirst({
      where: { bookingId },
      orderBy: { createdAt: "desc" }
    });
    if (payment) return Number(payment.amount || 0);
  }
  return null;
}

export async function GET() {
  const refunds = await listRefunds();
  return NextResponse.json({ refunds });
}

export async function POST(request: Request) {
  const body: any = await request.json().catch(() => ({}));
  const amount = await resolveAmount(body);
  if (!amount || !body.reason) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const refund = await createRefundRequest({
    bookingId: body.bookingId,
    bookingReference: body.bookingReference,
    paymentId: body.paymentId,
    amount,
    currency: body.currency,
    reason: body.reason,
    partial: Boolean(body.partial),
    approvalRequired: Boolean(body.approvalRequired),
    requestedByRole: body.requestedByRole,
    requestedBy: body.requestedBy,
    provider: body.provider,
    contactEmail: body.contactEmail,
    contactPhone: body.contactPhone,
    source: body.source,
    notes: body.notes,
    metadata: body.metadata,
  });
  return NextResponse.json({ refund }, { status: 201 });
}
