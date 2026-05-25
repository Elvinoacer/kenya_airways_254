"use client";

import React, { useEffect, useState } from "react";

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    reportType: "booking",
    intervalMinutes: 1440,
    format: "csv",
    paramsJson: "",
  });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/reports/schedules");
    const json = await res.json();
    setSchedules(json?.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    let payload: any = { ...form };
    try {
      payload.params = form.paramsJson
        ? JSON.parse(form.paramsJson)
        : undefined;
    } catch (e) {
      alert("Invalid params JSON");
      return;
    }
    delete payload.paramsJson;

    const res = await fetch("/api/reports/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await load();
      setForm({
        name: "",
        reportType: "booking",
        intervalMinutes: 1440,
        format: "csv",
        paramsJson: "",
      });
    }
  }

  return (
    <div className="text-[#1A1A1A]">
      <header className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-6 lg:px-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
              Automation
            </div>
            <h1 className="text-3xl font-black text-[#1A1A1A]">
              Scheduled Reports
            </h1>
            <p className="text-sm text-[#5e3f3c] mt-2 max-w-2xl">
              Configure automated report generation on recurring intervals.
            </p>
          </div>
        </div>
      </header>

      <main className="p-6 lg:p-8 space-y-8 max-w-[1200px]">
        {/* Create Schedule */}
        <section className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)]">
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">schedule_send</span>
            New Report Schedule
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Schedule Name</label>
              <input
                className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Daily Revenue"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Report Type</label>
              <select
                className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm appearance-none"
                value={form.reportType}
                onChange={(e) => setForm({ ...form, reportType: e.target.value })}
              >
                <option value="booking">Booking</option>
                <option value="revenue">Revenue</option>
                <option value="occupancy">Occupancy</option>
                <option value="manifest">Manifest</option>
                <option value="cancellations">Cancellations</option>
                <option value="refunds">Refunds</option>
                <option value="payments">Payments</option>
                <option value="analytics:revenue">Analytics - Revenue</option>
                <option value="analytics:occupancy">Analytics - Occupancy</option>
                <option value="analytics:peak_routes">Analytics - Peak routes</option>
                <option value="analytics:passenger_trends">Analytics - Passenger trends</option>
                <option value="analytics:booking_trends">Analytics - Booking trends</option>
                <option value="analytics:cancellations">Analytics - Cancellations</option>
                <option value="analytics:kpis">Analytics - KPI tracking</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Export Format</label>
              <select
                className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm appearance-none"
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value })}
              >
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Parameters JSON (Optional)</label>
              <input
                className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-mono"
                placeholder='e.g. {"from":"2026-05-01","to":"2026-05-24"}'
                value={form.paramsJson}
                onChange={(e) => setForm({ ...form, paramsJson: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Interval (Minutes)</label>
              <input
                type="number"
                className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                value={form.intervalMinutes}
                onChange={(e) => setForm({ ...form, intervalMinutes: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-[#e5e2e1]">
            <button
              className="bg-[#1A1A1A] hover:bg-black text-white font-bold rounded-xl px-8 py-3 transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
              onClick={create}
            >
              <span className="material-symbols-outlined text-[20px]">add_task</span>
              Create Schedule
            </button>
          </div>
        </section>

        {/* Schedule List */}
        <section className="bg-white rounded-3xl border border-[#e5e2e1] shadow-[0_8px_32px_rgba(13,13,13,0.06)] overflow-hidden">
          <div className="p-6 border-b border-[#e5e2e1] bg-[#fcf9f8] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#5e3f3c]">event_repeat</span>
              Active Schedules
            </h2>
            <span className="text-xs font-bold text-[#5e3f3c] bg-white px-3 py-1.5 rounded-lg border border-[#e5e2e1]">
              {schedules.length} schedules
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : schedules.length === 0 ? (
            <div className="p-12 text-center bg-[#fcf9f8]">
              <span className="material-symbols-outlined text-5xl text-[#5e3f3c] mb-4 opacity-30">event_repeat</span>
              <div className="font-bold text-[#1A1A1A] text-lg mb-1">No Schedules Configured</div>
              <p className="text-sm text-[#5e3f3c]">Create a schedule above to automate report generation.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[11px] font-bold uppercase tracking-widest text-[#5e3f3c] bg-white border-b border-[#e5e2e1]">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Interval</th>
                    <th className="px-6 py-4">Next Run</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e2e1] bg-white">
                  {schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-[#fcf9f8] transition-colors">
                      <td className="px-6 py-4 font-bold text-[#1A1A1A]">{s.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-[#fcf9f8] border border-[#e5e2e1] text-[#5e3f3c]">
                          {s.report_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-[#5e3f3c]">{s.interval_minutes} min</td>
                      <td className="px-6 py-4 text-xs text-[#5e3f3c]">{s.next_run_at || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
