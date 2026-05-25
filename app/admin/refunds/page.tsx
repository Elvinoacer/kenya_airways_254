"use client";

import React, { useEffect, useState } from "react";

type RefundRecord = {
  id: string;
  refund_ref: string;
  booking_reference: string | null;
  amount: number;
  currency: string;
  status: string;
  reason: string;
  partial: number;
  approval_required: number;
  requested_by_role: string | null;
  provider: string | null;
  created_at: string;
  updated_at: string;
};

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [report, setReport] = useState<any>(null);
  const [form, setForm] = useState({
    bookingId: "",
    paymentId: "",
    amount: "",
    reason: "Booking cancellation",
    approvalRequired: false,
    requestedByRole: "ADMIN",
    partial: false,
  });

  async function load() {
    const [refundRes, reportRes] = await Promise.all([
      fetch("/api/refunds"),
      fetch("/api/refunds/report"),
    ]);
    const refundData = refundRes.ok ? await refundRes.json() : { refunds: [] };
    const reportData = reportRes.ok ? await reportRes.json() : null;
    setRefunds(refundData.refunds || []);
    setReport(reportData);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch("/api/refunds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: form.bookingId || undefined,
        paymentId: form.paymentId || undefined,
        amount: form.amount ? Number(form.amount) : undefined,
        reason: form.reason,
        approvalRequired: form.approvalRequired,
        requestedByRole: form.requestedByRole,
        partial: form.partial,
        source: "MANUAL",
      }),
    });
    if (!res.ok) {
      alert("Could not create refund request");
      return;
    }
    setForm((current) => ({
      ...current,
      bookingId: "",
      paymentId: "",
      amount: "",
    }));
    await load();
  }

  async function act(refundId: string, action: string) {
    const res = await fetch(`/api/refunds/${refundId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, actor: "admin" }),
    });
    if (!res.ok) {
      alert("Refund action failed");
      return;
    }
    await load();
  }

  const totals = report?.totals || {
    count: 0,
    amount: 0,
    completedAmount: 0,
    failedAmount: 0,
    partialCount: 0,
    manualApprovalCount: 0,
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Refunds</h1>
        <p className="text-sm text-gray-600">
          Track automatic refunds, manual approvals, partial refunds, and
          completion status.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded border p-3">
          <div className="text-xs uppercase text-gray-500">Total refunds</div>
          <div className="text-xl font-semibold">{totals.count}</div>
        </div>
        <div className="rounded border p-3">
          <div className="text-xs uppercase text-gray-500">Total amount</div>
          <div className="text-xl font-semibold">{totals.amount}</div>
        </div>
        <div className="rounded border p-3">
          <div className="text-xs uppercase text-gray-500">
            Pending approvals
          </div>
          <div className="text-xl font-semibold">
            {report?.byStatus?.PENDING_APPROVAL?.count || 0}
          </div>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="grid gap-3 rounded border p-4 md:grid-cols-2"
      >
        <input
          className="rounded border p-2"
          placeholder="Booking ID"
          value={form.bookingId}
          onChange={(e) => setForm({ ...form, bookingId: e.target.value })}
        />
        <input
          className="rounded border p-2"
          placeholder="Payment ID"
          value={form.paymentId}
          onChange={(e) => setForm({ ...form, paymentId: e.target.value })}
        />
        <input
          className="rounded border p-2"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <input
          className="rounded border p-2"
          placeholder="Reason"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.approvalRequired}
            onChange={(e) =>
              setForm({ ...form, approvalRequired: e.target.checked })
            }
          />
          Manual approval required
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.partial}
            onChange={(e) => setForm({ ...form, partial: e.target.checked })}
          />
          Partial refund
        </label>
        <select
          className="rounded border p-2"
          value={form.requestedByRole}
          onChange={(e) =>
            setForm({ ...form, requestedByRole: e.target.value })
          }
        >
          <option value="ADMIN">ADMIN</option>
          <option value="STAFF">STAFF</option>
          <option value="PASSENGER">PASSENGER</option>
        </select>
        <button
          className="rounded bg-black px-3 py-2 text-white md:col-span-2"
          type="submit"
        >
          Create refund request
        </button>
      </form>

      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-2">Refund</th>
              <th className="p-2">Booking</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Status</th>
              <th className="p-2">Reason</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {refunds.length === 0 ? (
              <tr>
                <td className="p-3" colSpan={6}>
                  No refunds yet
                </td>
              </tr>
            ) : (
              refunds.map((refund) => (
                <tr key={refund.id} className="border-t">
                  <td className="p-2">{refund.refund_ref}</td>
                  <td className="p-2">{refund.booking_reference || "—"}</td>
                  <td className="p-2">
                    {refund.amount} {refund.currency}
                  </td>
                  <td className="p-2">{refund.status}</td>
                  <td className="p-2">{refund.reason}</td>
                  <td className="p-2 space-x-2">
                    {refund.status === "PENDING_APPROVAL" ? (
                      <>
                        <button
                          className="rounded border px-2 py-1"
                          onClick={() => act(refund.id, "APPROVE")}
                        >
                          Approve
                        </button>
                        <button
                          className="rounded border px-2 py-1"
                          onClick={() => act(refund.id, "REJECT")}
                        >
                          Reject
                        </button>
                      </>
                    ) : refund.status === "APPROVED" ||
                      refund.status === "REQUESTED" ? (
                      <button
                        className="rounded border px-2 py-1"
                        onClick={() => act(refund.id, "PROCESS")}
                      >
                        Process
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
