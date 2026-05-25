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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Scheduled Reports</h1>
      <div className="mb-4 grid gap-2 md:grid-cols-3">
        <input
          className="border px-3 py-2"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Schedule name"
        />
        <select
          className="border px-3 py-2"
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
          <option value="analytics:passenger_trends">
            Analytics - Passenger trends
          </option>
          <option value="analytics:booking_trends">
            Analytics - Booking trends
          </option>
          <option value="analytics:cancellations">
            Analytics - Cancellation analytics
          </option>
          <option value="analytics:kpis">Analytics - KPI tracking</option>
        </select>
        <select
          className="border px-3 py-2"
          value={form.format}
          onChange={(e) => setForm({ ...form, format: e.target.value })}
        >
          <option value="csv">CSV</option>
          <option value="excel">Excel</option>
          <option value="pdf">PDF</option>
        </select>
        <input
          className="border px-3 py-2"
          placeholder='Params JSON (e.g. {"from":"2026-05-01","to":"2026-05-24"})'
          value={form.paramsJson}
          onChange={(e) => setForm({ ...form, paramsJson: e.target.value })}
        />
        <input
          type="number"
          className="border px-3 py-2"
          value={form.intervalMinutes}
          onChange={(e) =>
            setForm({ ...form, intervalMinutes: Number(e.target.value) })
          }
        />
        <div className="md:col-span-3">
          <button
            className="rounded bg-[#002b5c] text-white px-4 py-2"
            onClick={create}
          >
            Create schedule
          </button>
        </div>
      </div>

      <div>
        {loading ? (
          <div>Loading schedules…</div>
        ) : (
          <table className="min-w-full border">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Interval (min)</th>
                <th>Next run</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td className="border px-2 py-1">{s.name}</td>
                  <td className="border px-2 py-1">{s.report_type}</td>
                  <td className="border px-2 py-1">{s.interval_minutes}</td>
                  <td className="border px-2 py-1">{s.next_run_at || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
