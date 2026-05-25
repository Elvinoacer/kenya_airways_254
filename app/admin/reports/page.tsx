"use client";

import React, { useState } from "react";

const REPORT_TYPES = [
  { value: "booking", label: "Booking reports", icon: "book_online" },
  { value: "revenue", label: "Revenue reports", icon: "payments" },
  { value: "occupancy", label: "Occupancy reports", icon: "airline_seat_recline_normal" },
  { value: "manifest", label: "Passenger manifests", icon: "group" },
  { value: "flight_summary", label: "Flight summaries", icon: "flight_takeoff" },
  { value: "cancellations", label: "Cancellation reports", icon: "cancel" },
  { value: "refunds", label: "Refund reports", icon: "currency_exchange" },
  { value: "payments", label: "Payment reports", icon: "receipt_long" },
  { value: "assignments", label: "Assignment reports", icon: "assignment_ind" },
  { value: "staff_performance", label: "Staff performance reports", icon: "assessment" },
  { value: "shift", label: "Shift reports", icon: "work_history" },
  { value: "crew_utilization", label: "Crew utilization reports", icon: "groups" },
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

  const selectedReport = REPORT_TYPES.find(r => r.value === type);

  return (
    <div className="text-[#1A1A1A]">
      <header className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-6 lg:px-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
              Intelligence
            </div>
            <h1 className="text-3xl font-black text-[#1A1A1A]">
              Reports & Exports
            </h1>
            <p className="text-sm text-[#5e3f3c] mt-2 max-w-2xl">
              Generate, view, and export operational, financial, and staffing reports.
            </p>
          </div>
        </div>
      </header>

      <main className="p-6 lg:p-8 space-y-8 max-w-[1600px]">
        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          {/* Controls Sidebar */}
          <section className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)] h-fit sticky top-32">
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">tune</span>
              Report Parameters
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-2">
                  Report Type
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5e3f3c] pointer-events-none">
                    {selectedReport?.icon || 'article'}
                  </span>
                  <select
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-bold text-[#1A1A1A] appearance-none"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    {REPORT_TYPES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-2">
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium"
                    placeholder="From"
                  />
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium"
                    placeholder="To"
                  />
                </div>
              </div>

              {["manifest", "flight_summary"].includes(type) && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-2">
                    Schedule ID
                  </label>
                  <input
                    type="text"
                    value={scheduleId}
                    onChange={(e) => setScheduleId(e.target.value)}
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium"
                    placeholder="e.g. SCH-12345"
                  />
                </div>
              )}

              {type === "staff_performance" && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-2">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium"
                    placeholder="e.g. EMP-98765"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-[#e5e2e1] space-y-3">
                <button
                  onClick={fetchJson}
                  className="w-full bg-[#1A1A1A] hover:bg-black text-white font-bold rounded-xl px-4 py-3 transition-colors shadow-sm flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                  )}
                  Preview Report
                </button>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => download("csv")}
                    className="w-full bg-white border border-[#e5e2e1] hover:bg-[#fcf9f8] text-[#1A1A1A] text-xs font-bold rounded-xl px-2 py-2.5 transition-colors shadow-sm flex flex-col items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[#5e3f3c] text-[20px]">csv</span>
                    CSV
                  </button>
                  <button
                    onClick={() => download("excel")}
                    className="w-full bg-white border border-[#e5e2e1] hover:bg-[#fcf9f8] text-[#1A1A1A] text-xs font-bold rounded-xl px-2 py-2.5 transition-colors shadow-sm flex flex-col items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[#5e3f3c] text-[20px]">table</span>
                    Excel
                  </button>
                  <button
                    onClick={() => download("pdf")}
                    className="w-full bg-white border border-[#e5e2e1] hover:bg-[#fcf9f8] text-[#1A1A1A] text-xs font-bold rounded-xl px-2 py-2.5 transition-colors shadow-sm flex flex-col items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[#5e3f3c] text-[20px]">picture_as_pdf</span>
                    PDF
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Results Area */}
          <section className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)] min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between mb-6 border-b border-[#e5e2e1] pb-4">
              <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">data_object</span>
                Data Preview
              </h2>
              {results && !results.error && Array.isArray(results) && (
                <span className="text-xs font-bold text-[#5e3f3c] bg-[#fcf9f8] px-3 py-1 rounded-lg border border-[#e5e2e1]">
                  {results.length} Records
                </span>
              )}
            </div>

            <div className="flex-1 flex flex-col">
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[#5e3f3c]">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                  <div className="text-sm font-bold">Generating Report...</div>
                  <div className="text-xs mt-1">This may take a few seconds.</div>
                </div>
              ) : results ? (
                results.error ? (
                  <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-[#c8102e]">
                    <div className="font-bold flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined">error</span>
                      Report Generation Failed
                    </div>
                    <div className="text-sm font-mono whitespace-pre-wrap">{results.error}</div>
                  </div>
                ) : (
                  <div className="flex-1 rounded-xl border border-[#e5e2e1] overflow-hidden flex flex-col">
                    <div className="bg-[#fcf9f8] px-4 py-2 border-b border-[#e5e2e1] flex items-center gap-2 shrink-0">
                      <span className="material-symbols-outlined text-[16px] text-green-600">check_circle</span>
                      <span className="text-xs font-bold uppercase tracking-widest text-[#5e3f3c]">JSON Response</span>
                    </div>
                    <pre className="flex-1 min-h-[400px] overflow-auto text-[11px] font-mono text-[#1A1A1A] p-4 bg-white custom-scrollbar">
                      {JSON.stringify(results, null, 2)}
                    </pre>
                  </div>
                )
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-[#5e3f3c] bg-[#fcf9f8] rounded-xl border border-dashed border-[#e5e2e1]">
                  <span className="material-symbols-outlined text-5xl mb-3 opacity-30">description</span>
                  <div className="font-bold text-[#1A1A1A] text-lg mb-1">No Report Generated</div>
                  <div className="text-sm text-center max-w-sm">
                    Configure your parameters on the left and click Preview Report to see data, or export directly.
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
