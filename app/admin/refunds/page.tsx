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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
    setLoading(true);
    const [refundRes, reportRes] = await Promise.all([
      fetch("/api/refunds"),
      fetch("/api/refunds/report"),
    ]);
    const refundData = refundRes.ok ? await refundRes.json() : { refunds: [] };
    const reportData = reportRes.ok ? await reportRes.json() : null;
    setRefunds(refundData.refunds || []);
    setReport(reportData);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
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
    setSubmitting(false);
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

  function formatMoney(amount: number) {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(amount || 0);
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
    <div className="text-[#1A1A1A]">
      <header className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-6 lg:px-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
              Financial Operations
            </div>
            <h1 className="text-3xl font-black text-[#1A1A1A]">
              Refunds Management
            </h1>
            <p className="text-sm text-[#5e3f3c] mt-2 max-w-2xl">
              Process manual refunds, oversee automated claims, and approve high-value returns.
            </p>
          </div>
          <button 
            onClick={load}
            className="flex items-center gap-2 bg-[#fcf9f8] border border-[#e5e2e1] hover:bg-white text-[#1A1A1A] font-bold rounded-xl px-5 py-2.5 transition-colors shadow-sm"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
            Sync Ledger
          </button>
        </div>
      </header>

      <main className="p-6 lg:p-8 space-y-8 max-w-[1600px]">
        {/* Metric Cards */}
        <section className="grid gap-6 md:grid-cols-3">
          <div className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Total Refunds Volume</div>
              <div className="text-3xl font-black text-[#1A1A1A]">{totals.count}</div>
            </div>
            <div className="bg-[#fcf9f8] p-3 rounded-xl border border-[#e5e2e1]">
              <span className="material-symbols-outlined text-[#5e3f3c] text-[24px]">receipt_long</span>
            </div>
          </div>
          
          <div className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-[#c8102e] mb-1">Total Amount</div>
              <div className="text-3xl font-black text-[#1A1A1A]">{formatMoney(totals.amount)}</div>
            </div>
            <div className="bg-red-50 p-3 rounded-xl border border-red-200">
              <span className="material-symbols-outlined text-[#c8102e] text-[24px]">account_balance_wallet</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-1">Pending Approvals</div>
              <div className="text-3xl font-black text-[#1A1A1A]">{report?.byStatus?.PENDING_APPROVAL?.count || 0}</div>
            </div>
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
              <span className="material-symbols-outlined text-amber-600 text-[24px]">gavel</span>
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
          {/* Create Refund Form */}
          <section className="bg-white rounded-3xl border border-[#e5e2e1] p-6 lg:p-8 shadow-[0_8px_32px_rgba(13,13,13,0.06)] h-fit">
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">add_circle</span>
              Initiate Refund
            </h2>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Booking Reference</label>
                <input
                  className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium"
                  placeholder="e.g. KQ-12345"
                  value={form.bookingId}
                  onChange={(e) => setForm({ ...form, bookingId: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Payment ID (Optional)</label>
                <input
                  className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium"
                  placeholder="Provider TXN ID"
                  value={form.paymentId}
                  onChange={(e) => setForm({ ...form, paymentId: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Amount (KES)</label>
                <input
                  type="number"
                  className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium"
                  placeholder="Full or partial amount"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Reason for Refund</label>
                <input
                  className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium"
                  placeholder="Reason..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 py-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="peer appearance-none w-5 h-5 border-2 border-[#e5e2e1] rounded checked:bg-primary checked:border-primary transition-colors cursor-pointer"
                      checked={form.approvalRequired}
                      onChange={(e) => setForm({ ...form, approvalRequired: e.target.checked })}
                    />
                    <span className="material-symbols-outlined absolute text-white text-[16px] pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity">check</span>
                  </div>
                  <span className="text-sm font-bold text-[#1A1A1A] group-hover:text-primary transition-colors">Requires Approval</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="peer appearance-none w-5 h-5 border-2 border-[#e5e2e1] rounded checked:bg-primary checked:border-primary transition-colors cursor-pointer"
                      checked={form.partial}
                      onChange={(e) => setForm({ ...form, partial: e.target.checked })}
                    />
                    <span className="material-symbols-outlined absolute text-white text-[16px] pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity">check</span>
                  </div>
                  <span className="text-sm font-bold text-[#1A1A1A] group-hover:text-primary transition-colors">Partial Refund</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Initiator Role</label>
                <div className="relative">
                  <select
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium appearance-none"
                    value={form.requestedByRole}
                    onChange={(e) => setForm({ ...form, requestedByRole: e.target.value })}
                  >
                    <option value="ADMIN">Administrator</option>
                    <option value="STAFF">Staff Member</option>
                    <option value="PASSENGER">Passenger Request</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#5e3f3c] pointer-events-none">expand_more</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#e5e2e1]">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#1A1A1A] hover:bg-black text-white font-bold rounded-xl px-4 py-3 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[20px]">send</span>
                  )}
                  Submit Request
                </button>
              </div>
            </form>
          </section>

          {/* Refunds Ledger */}
          <section className="bg-white rounded-3xl border border-[#e5e2e1] shadow-[0_8px_32px_rgba(13,13,13,0.06)] overflow-hidden">
            <div className="p-6 border-b border-[#e5e2e1] bg-[#fcf9f8] flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#5e3f3c]">history</span>
                Refund Ledger
              </h2>
              <span className="text-xs font-bold text-[#5e3f3c] bg-white px-3 py-1.5 rounded-lg border border-[#e5e2e1]">
                {refunds.length} entries
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-[11px] font-bold uppercase tracking-widest text-[#5e3f3c] border-b border-[#e5e2e1]">
                  <tr>
                    <th className="px-6 py-4">Reference</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4">Status & Details</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e2e1] bg-white">
                  {loading && refunds.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex justify-center">
                          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      </td>
                    </tr>
                  ) : refunds.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-[#5e3f3c]">
                        No refunds found in the system.
                      </td>
                    </tr>
                  ) : (
                    refunds.map((refund) => (
                      <tr key={refund.id} className="hover:bg-[#fcf9f8] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-mono font-bold text-primary">{refund.refund_ref}</div>
                          <div className="text-[10px] text-[#5e3f3c] mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">airplane_ticket</span>
                            {refund.booking_reference || "No Booking Ref"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-bold text-[#1A1A1A] text-lg">
                            {formatMoney(refund.amount)}
                          </div>
                          {refund.partial === 1 && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 bg-[#fcf9f8] border border-[#e5e2e1] text-[#5e3f3c] text-[9px] font-bold uppercase rounded">
                              Partial
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="mb-2">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${
                              refund.status === "COMPLETED" ? "bg-green-50 text-green-700 border-green-200" :
                              refund.status === "PENDING_APPROVAL" ? "bg-amber-50 text-amber-700 border-amber-200" :
                              refund.status === "REJECTED" ? "bg-red-50 text-[#c8102e] border-red-200" :
                              "bg-blue-50 text-blue-700 border-blue-200"
                            }`}>
                              {refund.status.replace("_", " ")}
                            </span>
                          </div>
                          <div className="text-xs text-[#1A1A1A] line-clamp-2" title={refund.reason}>
                            {refund.reason}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {refund.status === "PENDING_APPROVAL" ? (
                              <>
                                <button
                                  className="bg-green-50 border border-green-200 hover:bg-green-100 text-green-700 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                  onClick={() => act(refund.id, "APPROVE")}
                                >
                                  <span className="material-symbols-outlined text-[16px]">check</span>
                                  Approve
                                </button>
                                <button
                                  className="bg-red-50 border border-red-200 hover:bg-red-100 text-[#c8102e] rounded-lg px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                  onClick={() => act(refund.id, "REJECT")}
                                >
                                  <span className="material-symbols-outlined text-[16px]">close</span>
                                  Reject
                                </button>
                              </>
                            ) : refund.status === "APPROVED" || refund.status === "REQUESTED" ? (
                              <button
                                className="bg-[#1A1A1A] border border-[#1A1A1A] hover:bg-black text-white rounded-lg px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                                onClick={() => act(refund.id, "PROCESS")}
                              >
                                <span className="material-symbols-outlined text-[16px]">bolt</span>
                                Process
                              </button>
                            ) : (
                              <span className="text-[#5e3f3c] text-[10px] font-bold uppercase tracking-widest italic mr-2">
                                Locked
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
