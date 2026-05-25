import { query } from "./db";

export type CreatePaymentInput = {
  bookingId?: string;
  amount: number;
  currency?: string;
  provider: string; // 'MPESA' | 'AIRTEL' | 'CARD' | 'BANK_TRANSFER'
  metadata?: Record<string, any>;
};

export function createPayment(input: CreatePaymentInput) {
  const id =
    (globalThis as any).crypto?.randomUUID?.() ||
    String(Date.now()) + Math.random().toString(36).slice(2);
  const currency = input.currency || "KES";
  query.run(
    `INSERT INTO payments (id, booking_id, amount, currency, provider, metadata_json) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.bookingId || null,
      input.amount,
      currency,
      input.provider,
      JSON.stringify(input.metadata || {}),
    ],
  );
  const payment = query.get(`SELECT * FROM payments WHERE id = ?`, [id]);
  return payment;
}

export function getPayment(paymentId: string) {
  return query.get(`SELECT * FROM payments WHERE id = ?`, [paymentId]);
}

export function recordPaymentAttempt(
  paymentId: string,
  attemptNo: number,
  providerResponse: any,
  success = false,
) {
  const id =
    (globalThis as any).crypto?.randomUUID?.() ||
    String(Date.now()) + Math.random().toString(36).slice(2);
  query.run(
    `INSERT INTO payment_attempts (id, payment_id, attempt_no, provider_response_json, success) VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      paymentId,
      attemptNo,
      JSON.stringify(providerResponse || {}),
      success ? 1 : 0,
    ],
  );
  return { id };
}

export function updatePaymentStatus(
  paymentId: string,
  status: string,
  providerPaymentId?: string,
) {
  query.run(
    `UPDATE payments SET status = ?, provider_payment_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [status, providerPaymentId || null, paymentId],
  );
  return getPayment(paymentId);
}

// Provider adapter stubs
export async function startMpesaPayment(
  paymentId: string,
  phoneNumber: string,
) {
  // Placeholder: create a provider-specific request and return an instruction/token
  const providerPaymentId = `mpesa-${Date.now()}`;
  recordPaymentAttempt(
    paymentId,
    1,
    { providerPaymentId, phoneNumber, note: "mpesa_simulated" },
    false,
  );
  // In real integration, return the STK push instructions or checkout URL
  return { provider: "MPESA", providerPaymentId, nextAction: "STK_PUSH_SENT" };
}

export async function startAirtelPayment(
  paymentId: string,
  phoneNumber: string,
) {
  const providerPaymentId = `airtel-${Date.now()}`;
  recordPaymentAttempt(
    paymentId,
    1,
    { providerPaymentId, phoneNumber, note: "airtel_simulated" },
    false,
  );
  return { provider: "AIRTEL", providerPaymentId, nextAction: "DIAL_USSD" };
}

export async function startCardPayment(paymentId: string, cardInfo: any) {
  const providerPaymentId = `card-${Date.now()}`;
  recordPaymentAttempt(
    paymentId,
    1,
    { providerPaymentId, cardInfo, note: "card_simulated" },
    false,
  );
  return { provider: "CARD", providerPaymentId, nextAction: "REDIRECT_TO_3DS" };
}

// Webhook processor - called by webhook routes
export function processProviderWebhook(provider: string, payload: any) {
  // Very small processing: match provider_payment_id to payment and mark captured
  const providerPaymentId =
    payload.providerPaymentId || payload.transaction_id || payload.id;
  if (!providerPaymentId) return { error: "no_provider_id" };
  const payment = query.get(
    `SELECT * FROM payments WHERE provider_payment_id = ?`,
    [providerPaymentId],
  );
  if (!payment) return { error: "payment_not_found" };
  // Map provider statuses
  const status =
    payload.status === "SUCCESS" || payload.status === "COMPLETED"
      ? "CAPTURED"
      : payload.status === "PENDING"
        ? "AUTHORIZED"
        : "FAILED";
  const pid: any = payment;
  updatePaymentStatus(pid.id, status, providerPaymentId);
  recordPaymentAttempt(pid.id, 2, payload, status === "CAPTURED");
  return { ok: true };
}

export function createInvoiceForBooking(
  bookingId: string,
  amount: number,
  currency = "KES",
) {
  const id =
    (globalThis as any).crypto?.randomUUID?.() ||
    String(Date.now()) + Math.random().toString(36).slice(2);
  const invoiceNumber = `INV-${Date.now()}`;
  query.run(
    `INSERT INTO invoices (id, booking_id, invoice_number, amount, currency) VALUES (?, ?, ?, ?, ?)`,
    [id, bookingId, invoiceNumber, amount, currency],
  );
  return query.get(`SELECT * FROM invoices WHERE id = ?`, [id]);
}
