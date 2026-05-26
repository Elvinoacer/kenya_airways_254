import { prisma } from "./prisma";

export type CreatePaymentInput = {
  bookingId?: string;
  amount: number;
  currency?: string;
  provider: string; // 'MPESA' | 'AIRTEL' | 'CARD' | 'BANK_TRANSFER'
  metadata?: Record<string, any>;
};

export async function createPayment(input: CreatePaymentInput) {
  const currency = input.currency || "KES";
  const payment = await prisma.payment.create({
    data: {
      bookingId: input.bookingId || null,
      amount: input.amount,
      currency,
      provider: input.provider,
      metadataJson: JSON.stringify(input.metadata || {}),
    },
  });
  return payment;
}

export async function getPayment(paymentId: string) {
  return prisma.payment.findUnique({ where: { id: paymentId } });
}

export async function recordPaymentAttempt(
  paymentId: string,
  attemptNo: number,
  providerResponse: any,
  success = false,
) {
  const attempt = await prisma.paymentAttempt.create({
    data: {
      paymentId,
      attemptNo,
      providerResponseJson: JSON.stringify(providerResponse || {}),
      success,
    },
  });
  return { id: attempt.id };
}

export async function updatePaymentStatus(
  paymentId: string,
  status: string,
  providerPaymentId?: string,
) {
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: status as any,
      providerPaymentId: providerPaymentId || null,
    },
  });
  return getPayment(paymentId);
}

// Provider adapter stubs
export async function startMpesaPayment(
  paymentId: string,
  phoneNumber: string,
) {
  const providerPaymentId = `mpesa-${Date.now()}`;
  await recordPaymentAttempt(
    paymentId,
    1,
    { providerPaymentId, phoneNumber, note: "mpesa_simulated" },
    false,
  );
  return { provider: "MPESA", providerPaymentId, nextAction: "STK_PUSH_SENT" };
}

export async function startAirtelPayment(
  paymentId: string,
  phoneNumber: string,
) {
  const providerPaymentId = `airtel-${Date.now()}`;
  await recordPaymentAttempt(
    paymentId,
    1,
    { providerPaymentId, phoneNumber, note: "airtel_simulated" },
    false,
  );
  return { provider: "AIRTEL", providerPaymentId, nextAction: "DIAL_USSD" };
}

export async function startCardPayment(paymentId: string, cardInfo: any) {
  const providerPaymentId = `card-${Date.now()}`;
  await recordPaymentAttempt(
    paymentId,
    1,
    { providerPaymentId, cardInfo, note: "card_simulated" },
    false,
  );
  return { provider: "CARD", providerPaymentId, nextAction: "REDIRECT_TO_3DS" };
}

// Webhook processor - called by webhook routes
export async function processProviderWebhook(provider: string, payload: any) {
  const providerPaymentId =
    payload.providerPaymentId || payload.transaction_id || payload.id;
  if (!providerPaymentId) return { error: "no_provider_id" };
  const payment = await prisma.payment.findFirst({
    where: { providerPaymentId },
  });
  if (!payment) return { error: "payment_not_found" };
  const status =
    payload.status === "SUCCESS" || payload.status === "COMPLETED"
      ? "CAPTURED"
      : payload.status === "PENDING"
        ? "AUTHORIZED"
        : "FAILED";
  await updatePaymentStatus(payment.id, status, providerPaymentId);
  await recordPaymentAttempt(payment.id, 2, payload, status === "CAPTURED");
  return { ok: true };
}

export async function createInvoiceForBooking(
  bookingId: string,
  amount: number,
  currency = "KES",
) {
  const invoiceNumber = `INV-${Date.now()}`;
  const invoice = await prisma.invoice.create({
    data: {
      bookingId,
      invoiceNumber,
      amount,
      currency,
    },
  });
  return invoice;
}
