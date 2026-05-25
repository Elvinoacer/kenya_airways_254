"use client";

import React, { useEffect, useState } from "react";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/payments");
    if (!res.ok) {
      setPayments([]);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setPayments(data.payments || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function retry(paymentId: string) {
    // simple retry: call provider again (not implemented)
    alert(
      "Retry requested for " + paymentId + " (provider retry not implemented)",
    );
  }

  function formatMoney(amount: number, currency: string) {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currency || "KES",
      maximumFractionDigits: 2,
    }).format(amount || 0);
  }

  // Summary Metrics
  const summary = payments.reduce((acc, p) => {
    if (p.status === "COMPLETED" || p.status === "SUCCESS") acc.captured += p.amount;
    else if (p.status === "REFUNDED") acc.refunded += p.amount;
    else acc.pending += p.amount;
    return acc;
  }, { captured: 0, pending: 0, refunded: 0 });

  return (
    <div className="text-[#1A1A1A]">
      <header className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-6 lg:px-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
              Financial Operations
            </div>
            <h1 className="text-3xl font-black text-[#1A1A1A]">
              Payment Gateway
            </h1>
            <p className="text-sm text-[#5e3f3c] mt-2 max-w-2xl">
              Monitor transactions, manage provider integrations, and handle payment retries.
            </p>
          </div>
          <button 
            onClick={load}
            className="flex items-center gap-2 bg-[#fcf9f8] border border-[#e5e2e1] hover:bg-white text-[#1A1A1A] font-bold rounded-xl px-5 py-2.5 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh Ledger
          </button>
        </div>
      </header>

      <main className="p-6 lg:p-8 space-y-8 max-w-[1600px]">
        {/* Metric Cards */}
        <section className="grid gap-6 md:grid-cols-3">
          <div className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-green-700 mb-1">Captured Revenue</div>
              <div className="text-3xl font-black text-[#1A1A1A]">{formatMoney(summary.captured, "KES")}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-xl border border-green-200">
              <span className="material-symbols-outlined text-green-600 text-[24px]">verified</span>
            </div>
          </div>
          
          <div className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-1">Pending Processing</div>
              <div className="text-3xl font-black text-[#1A1A1A]">{formatMoney(summary.pending, "KES")}</div>
            </div>
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
              <span className="material-symbols-outlined text-amber-600 text-[24px]">hourglass_top</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Refunded</div>
              <div className="text-3xl font-black text-[#1A1A1A]">{formatMoney(summary.refunded, "KES")}</div>
            </div>
            <div className="bg-[#fcf9f8] p-3 rounded-xl border border-[#e5e2e1]">
              <span className="material-symbols-outlined text-[#5e3f3c] text-[24px]">currency_exchange</span>
            </div>
          </div>
        </section>

        {/* Ledger Table */}
        <section className="bg-white rounded-3xl border border-[#e5e2e1] shadow-[0_8px_32px_rgba(13,13,13,0.06)] overflow-hidden">
          <div className="p-6 border-b border-[#e5e2e1] flex items-center justify-between bg-[#fcf9f8]">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#5e3f3c] text-[24px]">receipt_long</span>
              <h2 className="text-xl font-bold text-[#1A1A1A]">Transaction Ledger</h2>
            </div>
            <div className="text-xs font-bold text-[#5e3f3c] bg-white px-3 py-1.5 rounded-lg border border-[#e5e2e1]">
              {payments.length} transactions
            </div>
          </div>

          {loading ? (
             <div className="flex items-center justify-center p-12">
               <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
             </div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center bg-[#fcf9f8]">
              <span className="material-symbols-outlined text-[#5e3f3c] text-5xl mb-4 opacity-50">payments</span>
              <div className="text-[#1A1A1A] font-bold text-lg mb-1">No Payments Found</div>
              <p className="text-[#5e3f3c]">There are no transactions recorded in the ledger.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[11px] font-bold uppercase tracking-widest text-[#5e3f3c] bg-white border-b border-[#e5e2e1]">
                  <tr>
                    <th className="px-6 py-4">Transaction ID</th>
                    <th className="px-6 py-4">Booking Ref</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                    <th className="px-6 py-4">Provider</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e2e1] bg-white">
                  {payments.map((p) => {
                    const status = p.status?.toUpperCase() || "";
                    let statusClass = "bg-slate-100 text-slate-700 border-slate-200";
                    let icon = "schedule";
                    
                    if (["COMPLETED", "SUCCESS", "PAID"].includes(status)) {
                      statusClass = "bg-green-50 text-green-700 border-green-200";
                      icon = "check_circle";
                    } else if (["FAILED", "DECLINED", "CANCELLED"].includes(status)) {
                      statusClass = "bg-red-50 text-[#c8102e] border-red-200";
                      icon = "cancel";
                    } else if (["REFUNDED", "PARTIAL_REFUND"].includes(status)) {
                      statusClass = "bg-[#fcf9f8] text-[#5e3f3c] border-[#e5e2e1]";
                      icon = "currency_exchange";
                    }

                    return (
                      <tr key={p.id} className="hover:bg-[#fcf9f8] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-mono text-xs font-bold text-[#1A1A1A] truncate max-w-[120px]" title={p.id}>
                            {p.id}
                          </div>
                          <div className="text-[10px] text-[#5e3f3c] mt-1">
                            {p.created_at ? new Date(p.created_at).toLocaleString() : "—"}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono font-medium text-primary">
                          {p.booking_id || "—"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-mono font-black text-[#1A1A1A]">
                            {formatMoney(p.amount, p.currency)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-white border border-[#e5e2e1] text-[#5e3f3c]">
                            <span className="material-symbols-outlined text-[12px]">account_balance</span>
                            {p.provider}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${statusClass}`}>
                            <span className="material-symbols-outlined text-[14px]">{icon}</span>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {["FAILED", "DECLINED", "PENDING"].includes(status) && (
                            <button
                              className="bg-white border border-[#e5e2e1] hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] text-[#1A1A1A] rounded-lg px-3 py-1.5 text-xs font-bold transition-all shadow-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 cursor-pointer"
                              onClick={() => retry(p.id)}
                            >
                              <span className="material-symbols-outlined text-[16px]">refresh</span>
                              Retry
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
