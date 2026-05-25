"use client";

import React, { useState } from "react";

const REPORT_TYPES = [
  { value: "booking", label: "Booking reports" },
  { value: "revenue", label: "Revenue reports" },
  { value: "occupancy", label: "Occupancy reports" },
  { value: "manifest", label: "Passenger manifests" },
  { value: "flight_summary", label: "Flight summaries" },
  { value: "cancellations", label: "Cancellation reports" },
  { value: "refunds", label: "Refund reports" },
  { value: "payments", label: "Payment reports" },
  { value: "assignments", label: "Assignment reports" },
  { value: "staff_performance", label: "Staff performance reports" },
  { value: "shift", label: "Shift reports" },
  { value: "crew_utilization", label: "Crew utilization reports" },
];

export default function ReportsPage() {
  const [type, setType] = useState<string>("booking");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [scheduleId, setScheduleId] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  function buildUrl(format?: string) {
    const params = new URLSearchParams();
    params.set("type", type);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (scheduleId) params.set("scheduleId", scheduleId);
    if (employeeId) params.set("employeeId", employeeId);
    if (format) params.set("format", format);
    return `/api/reports?${params.toString()}`;
  }

  async function fetchJson() {
    setLoading(true);
    try {
      const res = await fetch(buildUrl());
      const json = await res.json();
      setResults(json?.data ?? json);
    } catch (err) {
      setResults({ error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  function download(format: "csv" | "excel" | "pdf") {
    const url = buildUrl(format);
    // For csv/excel we set window.location to trigger download
    if (format === "csv" || format === "excel") {
      window.location.href = url;
      return;
    }
    // For PDF open in new tab (HTML view returned) so user can print to PDF
    window.open(url, "_blank");
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-600">
            Ticketing and operations reports
          </p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <label className="block text-sm font-medium text-slate-700">
            Report
          </label>
          <select
            className="mt-2 w-full rounded-lg border px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {REPORT_TYPES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          <label className="mt-3 block text-sm font-medium text-slate-700">
            From
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-2 w-full rounded-lg border px-3 py-2"
          />

          <label className="mt-3 block text-sm font-medium text-slate-700">
            To
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-2 w-full rounded-lg border px-3 py-2"
          />

          <label className="mt-3 block text-sm font-medium text-slate-700">
            Schedule ID (for manifest / flight summary)
          </label>
          <input
            type="text"
            value={scheduleId}
            onChange={(e) => setScheduleId(e.target.value)}
            className="mt-2 w-full rounded-lg border px-3 py-2"
          />

          {type === "staff_performance" ? (
            <>
              <label className="mt-3 block text-sm font-medium text-slate-700">
                Employee ID
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="mt-2 w-full rounded-lg border px-3 py-2"
              />
            </>
          ) : null}

          <div className="mt-4 flex gap-2">
            <button
              onClick={fetchJson}
              className="rounded-lg bg-[#002b5c] px-4 py-2 text-white"
            >
              Run
            </button>
            <button
              onClick={() => download("csv")}
              className="rounded-lg border px-4 py-2"
            >
              Download CSV
            </button>
            <button
              onClick={() => download("excel")}
              className="rounded-lg border px-4 py-2"
            >
              Download Excel
            </button>
            <button
              onClick={() => download("pdf")}
              className="rounded-lg border px-4 py-2"
            >
              Open PDF
            </button>
          </div>
        </div>

        <div className="md:col-span-2 rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Results</h2>
          {loading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : results ? (
            <pre className="mt-3 max-h-[60vh] overflow-auto text-xs">
              {JSON.stringify(results, null, 2)}
            </pre>
          ) : (
            <div className="mt-3 text-sm text-slate-500">
              No results yet — run a report or download an export.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
