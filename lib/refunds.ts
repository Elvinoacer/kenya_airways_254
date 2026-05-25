import { query } from "./db";
import { getPayment, updatePaymentStatus } from "./payments";
import { sendEmail, sendSms } from "./notifications";

export type RefundStatus =
  | "REQUESTED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "PROCESSING"
  | "COMPLETED"
  | "REJECTED"
  | "FAILED";

export type RefundInput = {
  bookingId?: string;
  bookingReference?: string;
  paymentId?: string;
  amount: number;
  currency?: string;
  reason: string;
  partial?: boolean;
  approvalRequired?: boolean;
  requestedByRole?: string;
  requestedBy?: string;
  approvedBy?: string;
  rejectedBy?: string;
  provider?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  source?: string;
  notes?: string;
  metadata?: Record<string, any>;
};

export type RefundRecord = {
  id: string;
  refund_ref: string;
  booking_id: string | null;
  booking_reference: string | null;
  payment_id: string | null;
  provider: string | null;
  provider_refund_id: string | null;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason: string;
  partial: number;
  approval_required: number;
  requested_by_role: string | null;
  requested_by: string | null;
  approved_by: string | null;
  rejected_by: string | null;
  failure_reason: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  source: string | null;
  notes: string | null;
  metadata_json: string | null;
  requested_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
};

function makeId() {
  return (
    (globalThis as any).crypto?.randomUUID?.() ||
    String(Date.now()) + Math.random().toString(36).slice(2)
  );
}

function recordRefundEvent(
  refundId: string,
  status: RefundStatus,
  message?: string,
  actor?: string,
  details?: Record<string, any>,
) {
  query.run(
    `INSERT INTO refund_events (id, refund_id, status, message, actor, details_json) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      makeId(),
      refundId,
      status,
      message || null,
      actor || null,
      JSON.stringify(details || {}),
    ],
  );
}

function getRefundRow(refundId: string) {
  return query.get<RefundRecord>(`SELECT * FROM refunds WHERE id = ?`, [
    refundId,
  ]);
}

function getRefundsForPayment(paymentId: string) {
  return query.all<RefundRecord>(
    `SELECT * FROM refunds WHERE payment_id = ? AND status = 'COMPLETED'`,
    [paymentId],
  );
}

function refreshPaymentRefundStatus(paymentId: string) {
  const payment: any = getPayment(paymentId);
  if (!payment) return;
  const refundedAmount = getRefundsForPayment(paymentId).reduce(
    (sum, refund) => sum + Number(refund.amount || 0),
    0,
  );
  const paymentAmount = Number(payment.amount || 0);
  if (paymentAmount > 0 && refundedAmount >= paymentAmount - 0.01) {
    updatePaymentStatus(
      paymentId,
      "REFUNDED",
      payment.provider_payment_id || undefined,
    );
  }
}

function notifyRefundStatus(refund: RefundRecord, message: string) {
  const email = refund.contact_email;
  const phone = refund.contact_phone;
  if (email) {
    void sendEmail(
      email,
      `Refund ${refund.refund_ref} ${refund.status.toLowerCase()}`,
      `${message}\nAmount: ${refund.amount} ${refund.currency}`,
    );
  }
  if (phone) {
    void sendSms(
      phone,
      `Refund ${refund.refund_ref} ${refund.status.toLowerCase()}: ${message}`,
    );
  }
}

function completeRefund(refundId: string, actor?: string) {
  const refund: any = getRefundRow(refundId);
  if (!refund) throw new Error("Refund not found");
  if (refund.status === "COMPLETED") return refund as RefundRecord;

  const providerRefundId =
    refund.provider_refund_id ||
    `${refund.provider || "manual"}-refund-${Date.now()}`;
  query.run(
    `UPDATE refunds SET status = ?, provider_refund_id = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ["COMPLETED", providerRefundId, refundId],
  );
  recordRefundEvent(refundId, "COMPLETED", "Refund completed", actor, {
    providerRefundId,
  });
  refreshPaymentRefundStatus(refund.payment_id);
  const updated = getRefundRow(refundId) as RefundRecord;
  notifyRefundStatus(updated, "Your refund has been completed.");
  return updated;
}

export function listRefunds() {
  return query.all<RefundRecord>(
    `SELECT * FROM refunds ORDER BY created_at DESC`,
  );
}

export function getRefund(refundId: string) {
  return getRefundRow(refundId);
}

export function createRefundRequest(input: RefundInput) {
  const payment: any = input.paymentId ? getPayment(input.paymentId) : null;
  const refundId = makeId();
  const refundRef = `RFD-${Date.now()}`;
  const currency = input.currency || payment?.currency || "KES";
  const status: RefundStatus = input.approvalRequired
    ? "PENDING_APPROVAL"
    : "REQUESTED";
  const provider = input.provider || payment?.provider || null;
  query.run(
    `INSERT INTO refunds (
      id, refund_ref, booking_id, booking_reference, payment_id, provider, amount, currency,
      status, reason, partial, approval_required, requested_by_role, requested_by, approved_by,
      rejected_by, contact_email, contact_phone, source, notes, metadata_json, requested_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      refundId,
      refundRef,
      input.bookingId || null,
      input.bookingReference || null,
      input.paymentId || null,
      provider,
      input.amount,
      currency,
      status,
      input.reason,
      input.partial ? 1 : 0,
      input.approvalRequired ? 1 : 0,
      input.requestedByRole || null,
      input.requestedBy || null,
      input.approvedBy || null,
      input.rejectedBy || null,
      input.contactEmail || payment?.contact_email || null,
      input.contactPhone || payment?.contact_phone || null,
      input.source || null,
      input.notes || null,
      JSON.stringify(input.metadata || {}),
    ],
  );

  const refund = getRefundRow(refundId) as RefundRecord;
  recordRefundEvent(
    refundId,
    refund.status,
    "Refund requested",
    input.requestedBy,
    input.metadata,
  );

  if (refund.status === "PENDING_APPROVAL") {
    notifyRefundStatus(refund, "Your refund is waiting for manual approval.");
    return refund;
  }

  return processRefund(refundId, input.requestedBy);
}

export function approveRefund(refundId: string, actor?: string) {
  const refund: any = getRefundRow(refundId);
  if (!refund) throw new Error("Refund not found");
  if (refund.status === "REJECTED") throw new Error("Refund was rejected");
  query.run(
    `UPDATE refunds SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ["APPROVED", actor || refund.approved_by || null, refundId],
  );
  recordRefundEvent(refundId, "APPROVED", "Refund approved", actor);
  return processRefund(refundId, actor);
}

export function rejectRefund(
  refundId: string,
  actor?: string,
  reason?: string,
) {
  const refund: any = getRefundRow(refundId);
  if (!refund) throw new Error("Refund not found");
  query.run(
    `UPDATE refunds SET status = ?, rejected_by = ?, rejected_at = CURRENT_TIMESTAMP, failure_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ["REJECTED", actor || null, reason || "Rejected by reviewer", refundId],
  );
  recordRefundEvent(
    refundId,
    "REJECTED",
    reason || "Rejected by reviewer",
    actor,
  );
  const updated = getRefundRow(refundId) as RefundRecord;
  notifyRefundStatus(updated, reason || "Your refund was rejected.");
  return updated;
}

export function processRefund(refundId: string, actor?: string) {
  const refund: any = getRefundRow(refundId);
  if (!refund) throw new Error("Refund not found");
  if (refund.status === "COMPLETED") return refund as RefundRecord;
  if (refund.status === "REJECTED") throw new Error("Refund was rejected");

  query.run(
    `UPDATE refunds SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ["PROCESSING", refundId],
  );
  recordRefundEvent(refundId, "PROCESSING", "Refund processing started", actor);

  const providerRefundId = `${refund.provider || "manual"}-refund-${Date.now()}`;
  query.run(
    `UPDATE refunds SET status = ?, provider_refund_id = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ["COMPLETED", providerRefundId, refundId],
  );
  recordRefundEvent(refundId, "COMPLETED", "Refund completed", actor, {
    providerRefundId,
  });
  refreshPaymentRefundStatus(refund.payment_id);
  const updated = getRefundRow(refundId) as RefundRecord;
  notifyRefundStatus(updated, "Your refund has been completed.");
  return updated;
}

export function createRefundForCancellation(input: {
  bookingId: string;
  bookingReference: string;
  amount: number;
  currency?: string;
  reason: string;
  partial?: boolean;
  requestedByRole?: string;
  actor?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string;
}) {
  const payment: any = query.get(
    `SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1`,
    [input.bookingId],
  );

  return createRefundRequest({
    bookingId: input.bookingId,
    bookingReference: input.bookingReference,
    paymentId: payment?.id || undefined,
    amount: input.amount,
    currency: input.currency || payment?.currency || "KES",
    reason: input.reason,
    partial: input.partial,
    approvalRequired:
      input.requestedByRole === "STAFF" || input.requestedByRole === "ADMIN",
    requestedByRole: input.requestedByRole,
    requestedBy: input.actor,
    provider: payment?.provider,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    source: "BOOKING_CANCELLATION",
    notes: input.notes,
    metadata: {
      bookingReference: input.bookingReference,
      bookingId: input.bookingId,
      paymentId: payment?.id || null,
    },
  });
}

export function getRefundReport() {
  const refunds = listRefunds();
  const byStatus = refunds.reduce<
    Record<string, { count: number; amount: number }>
  >((acc, refund) => {
    const status = refund.status;
    if (!acc[status]) acc[status] = { count: 0, amount: 0 };
    acc[status].count += 1;
    acc[status].amount += Number(refund.amount || 0);
    return acc;
  }, {});
  const totals = refunds.reduce(
    (acc, refund) => {
      acc.count += 1;
      acc.amount += Number(refund.amount || 0);
      if (refund.partial) acc.partialCount += 1;
      if (refund.approval_required) acc.manualApprovalCount += 1;
      if (refund.status === "COMPLETED")
        acc.completedAmount += Number(refund.amount || 0);
      if (refund.status === "FAILED")
        acc.failedAmount += Number(refund.amount || 0);
      return acc;
    },
    {
      count: 0,
      amount: 0,
      completedAmount: 0,
      failedAmount: 0,
      partialCount: 0,
      manualApprovalCount: 0,
    },
  );
  return {
    totals,
    byStatus,
    refunds,
  };
}
