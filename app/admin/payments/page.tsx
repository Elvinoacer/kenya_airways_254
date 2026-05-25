"use client";

import React, { useEffect, useState } from "react";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);

  async function load() {
    const res = await fetch("/api/payments");
    if (!res.ok) return setPayments([]);
    const data = await res.json();
    setPayments(data.payments || []);
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Payments</h1>
      <div className="mt-4">
        {payments.length === 0 ? (
          <div>No payments</div>
        ) : (
          <table className="w-full mt-3">
            <thead>
              <tr className="text-left">
                <th>Invoice/Booking</th>
                <th>Amount</th>
                <th>Provider</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2">{p.booking_id || "—"}</td>
                  <td className="p-2">
                    {p.amount} {p.currency}
                  </td>
                  <td className="p-2">{p.provider}</td>
                  <td className="p-2">{p.status}</td>
                  <td className="p-2">
                    <button
                      className="rounded border px-2"
                      onClick={() => retry(p.id)}
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
