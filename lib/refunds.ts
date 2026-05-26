import { prisma } from "./prisma";
import { getPayment, updatePaymentStatus } from "./payments";
import { sendEmail } from "./notifications";
import { RefundStatus } from "@prisma/client";

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

async function recordRefundEvent(
  refundId: string,
  status: RefundStatus,
  message?: string,
  actor?: string,
  details?: Record<string, any>,
) {
  await prisma.refundEvent.create({
    data: {
      refundId,
      status: status as string,
      message: message || null,
      actor: actor || null,
      detailsJson: JSON.stringify(details || {}),
    },
  });
}

async function getRefundsForPayment(paymentId: string) {
  return prisma.refund.findMany({
    where: { paymentId, status: "COMPLETED" },
  });
}

async function refreshPaymentRefundStatus(paymentId: string) {
  const payment = await getPayment(paymentId);
  if (!payment) return;
  const refunds = await getRefundsForPayment(paymentId);
  const refundedAmount = refunds.reduce((sum, refund) => sum + Number(refund.amount || 0), 0);
  const paymentAmount = Number(payment.amount || 0);
  if (paymentAmount > 0 && refundedAmount >= paymentAmount - 0.01) {
    await updatePaymentStatus(paymentId, "REFUNDED", payment.providerPaymentId || undefined);
  }
}

function notifyRefundStatus(refund: any, message: string) {
  const email = refund.contactEmail;
  if (email) {
    void sendEmail(
      email,
      `Refund ${refund.refundRef} ${refund.status.toLowerCase()}`,
      `${message}\nAmount: ${refund.amount} ${refund.currency}`,
    );
  }
}

async function completeRefund(refundId: string, actor?: string) {
  const refund = await getRefund(refundId);
  if (!refund) throw new Error("Refund not found");
  if (refund.status === "COMPLETED") return refund;

  const providerRefundId = refund.providerRefundId || `${refund.provider || "manual"}-refund-${Date.now()}`;

  const updated = await prisma.refund.update({
    where: { id: refundId },
    data: {
      status: "COMPLETED",
      providerRefundId,
      completedAt: new Date(),
    },
  });

  await recordRefundEvent(refundId, "COMPLETED", "Refund completed", actor, {
    providerRefundId,
  });
  if (updated.paymentId) {
    await refreshPaymentRefundStatus(updated.paymentId);
  }
  notifyRefundStatus(updated, "Your refund has been completed.");
  return updated;
}

export async function listRefunds() {
  return prisma.refund.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getRefund(refundId: string) {
  return prisma.refund.findUnique({ where: { id: refundId } });
}

export async function createRefundRequest(input: RefundInput) {
  const payment = input.paymentId ? await getPayment(input.paymentId) : null;
  const refundRef = `RFD-${Date.now()}`;
  const currency = input.currency || payment?.currency || "KES";
  const status: RefundStatus = input.approvalRequired ? "PENDING_APPROVAL" : "REQUESTED";
  const provider = input.provider || payment?.provider || null;

  const refund = await prisma.refund.create({
    data: {
      refundRef,
      bookingId: input.bookingId || null,
      bookingReference: input.bookingReference || null,
      paymentId: input.paymentId || null,
      provider,
      amount: input.amount,
      currency,
      status,
      reason: input.reason,
      partial: input.partial || false,
      approvalRequired: input.approvalRequired || false,
      requestedByRole: input.requestedByRole || null,
      requestedBy: input.requestedBy || null,
      approvedBy: input.approvedBy || null,
      rejectedBy: input.rejectedBy || null,
      contactEmail: input.contactEmail || (payment as any)?.contactEmail || null,
      contactPhone: input.contactPhone || (payment as any)?.contactPhone || null,
      source: input.source || null,
      notes: input.notes || null,
      metadataJson: JSON.stringify(input.metadata || {}),
    },
  });

  await recordRefundEvent(refund.id, refund.status, "Refund requested", input.requestedBy, input.metadata);

  if (refund.status === "PENDING_APPROVAL") {
    notifyRefundStatus(refund, "Your refund is waiting for manual approval.");
    return refund;
  }

  return processRefund(refund.id, input.requestedBy);
}

export async function approveRefund(refundId: string, actor?: string) {
  const refund = await getRefund(refundId);
  if (!refund) throw new Error("Refund not found");
  if (refund.status === "REJECTED") throw new Error("Refund was rejected");

  await prisma.refund.update({
    where: { id: refundId },
    data: {
      status: "APPROVED",
      approvedBy: actor || refund.approvedBy || null,
      approvedAt: new Date(),
    },
  });

  await recordRefundEvent(refundId, "APPROVED", "Refund approved", actor);
  return processRefund(refundId, actor);
}

export async function rejectRefund(refundId: string, actor?: string, reason?: string) {
  const refund = await getRefund(refundId);
  if (!refund) throw new Error("Refund not found");

  const updated = await prisma.refund.update({
    where: { id: refundId },
    data: {
      status: "REJECTED",
      rejectedBy: actor || null,
      rejectedAt: new Date(),
      failureReason: reason || "Rejected by reviewer",
    },
  });

  await recordRefundEvent(refundId, "REJECTED", reason || "Rejected by reviewer", actor);
  notifyRefundStatus(updated, reason || "Your refund was rejected.");
  return updated;
}

export async function processRefund(refundId: string, actor?: string) {
  let refund = await getRefund(refundId);
  if (!refund) throw new Error("Refund not found");
  if (refund.status === "COMPLETED") return refund;
  if (refund.status === "REJECTED") throw new Error("Refund was rejected");

  await prisma.refund.update({
    where: { id: refundId },
    data: { status: "PROCESSING" },
  });
  await recordRefundEvent(refundId, "PROCESSING", "Refund processing started", actor);

  const providerRefundId = `${refund.provider || "manual"}-refund-${Date.now()}`;
  const updated = await prisma.refund.update({
    where: { id: refundId },
    data: {
      status: "COMPLETED",
      providerRefundId,
      completedAt: new Date(),
    },
  });

  await recordRefundEvent(refundId, "COMPLETED", "Refund completed", actor, {
    providerRefundId,
  });

  if (updated.paymentId) {
    await refreshPaymentRefundStatus(updated.paymentId);
  }

  notifyRefundStatus(updated, "Your refund has been completed.");
  return updated;
}

export async function createRefundForCancellation(input: {
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
  const payment = await prisma.payment.findFirst({
    where: { bookingId: input.bookingId },
    orderBy: { createdAt: "desc" },
  });

  return createRefundRequest({
    bookingId: input.bookingId,
    bookingReference: input.bookingReference,
    paymentId: payment?.id || undefined,
    amount: input.amount,
    currency: input.currency || payment?.currency || "KES",
    reason: input.reason,
    partial: input.partial,
    approvalRequired: input.requestedByRole === "STAFF" || input.requestedByRole === "ADMIN",
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

export async function getRefundReport() {
  const refunds = await listRefunds();
  const byStatus = refunds.reduce<Record<string, { count: number; amount: number }>>((acc, refund) => {
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
      if (refund.approvalRequired) acc.manualApprovalCount += 1;
      if (refund.status === "COMPLETED") acc.completedAmount += Number(refund.amount || 0);
      if (refund.status === "FAILED") acc.failedAmount += Number(refund.amount || 0);
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
