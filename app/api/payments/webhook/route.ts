import { NextResponse } from "next/server";
import { processProviderWebhook } from "../../../../lib/payments";
import { prisma } from "../../../../lib/prisma";

export async function POST(request: Request) {
  const provider = request.headers.get("x-provider") || "UNKNOWN";
  const payload = await request.json().catch(() => ({}));

  // Try match by providerPaymentId to payment
  const providerPaymentId =
    payload.providerPaymentId || payload.transaction_id || payload.id;
  if (!providerPaymentId)
    return NextResponse.json({ error: "no_provider_id" }, { status: 400 });

  // Very small default mapping: if provider sent status, update local record
  const payment = await prisma.payment.findFirst({
    where: { providerPaymentId }
  });
  
  if (!payment) {
    // attempt to find by amount/booking if available (best-effort)
    return NextResponse.json({ error: "unknown_payment" }, { status: 404 });
  }

  // process using payments helper
  const result = await processProviderWebhook(provider, payload);
  return NextResponse.json(result);
}
