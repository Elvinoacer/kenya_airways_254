"use client";

import React, { useEffect, useRef, useState } from "react";

const METRICS = [
  { value: "revenue", label: "Revenue analytics" },
  { value: "occupancy", label: "Flight occupancy analytics" },
  { value: "peak_routes", label: "Peak route analytics" },
  { value: "passenger_trends", label: "Passenger trends" },
  { value: "booking_trends", label: "Booking trends" },
  { value: "cancellations", label: "Cancellation analytics" },
  { value: "forecast_revenue", label: "Revenue forecasting" },
  { value: "kpis", label: "KPI tracking" },
];

export default function AnalyticsPage() {
  const [metric, setMetric] = useState<string>("revenue");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  function buildUrl() {
    const params = new URLSearchParams();
    params.set("metric", metric);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `/api/analytics?${params.toString()}`;
  }

  async function run() {
    setLoading(true);
    try {
      const res = await fetch(buildUrl());
      const json = await res.json();
      setData(json);
    } catch (err) {
      setData({ error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (!data || !Array.isArray(data)) return;

    // build simple time-series if data has `period` and `revenue` or `bookings`
    const labels = data.map(
      (d: any) =>
        d.period ||
        d.flight_number ||
        d.schedule_id ||
        JSON.stringify(d).slice(0, 10),
    );
    const revenueVals = data.map((d: any) =>
      Number(d.revenue ?? d.bookings ?? d.seats_booked ?? 0),
    );

    let isMounted = true;

    (async () => {
      const ctx = canvasRef.current!.getContext("2d");
      if (!ctx) return;
      // destroy existing chart if present
      // store chart instance on element
      const existing: any = (canvasRef.current as any).__chartInstance;
      if (existing) {
        try {
          existing.destroy();
        } catch (_) {}
      }
      // create chart
      const Chart = (await import("chart.js/auto")).default;
      if (!isMounted) return;
      const chart = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: metric,
              data: revenueVals,
              borderColor: "#2563eb",
              backgroundColor: "rgba(37,99,235,0.2)",
              tension: 0.2,
            },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false },
      });
      (canvasRef.current as any).__chartInstance = chart;
    })();

    return () => {
      isMounted = false;
    };
  }, [data, metric]);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-600">
          Revenue, occupancy and KPI dashboards
        </p>
      </header>

      <div className="rounded-xl border bg-white p-4 mb-4">
        <div className="grid md:grid-cols-4 gap-3">
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="rounded-lg border px-3 py-2"
          >
            {METRICS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border px-3 py-2"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border px-3 py-2"
          />
          <div className="flex gap-2">
            <button
              onClick={run}
              className="rounded-lg bg-[#002b5c] px-4 py-2 text-white"
            >
              Run
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <h2 className="text-lg font-semibold">Results</h2>
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : data ? (
          <div className="mt-3 grid gap-3">
            <div style={{ height: 320 }}>
              <canvas ref={canvasRef} />
            </div>
            <pre className="max-h-[40vh] overflow-auto text-xs">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-500">
            No results yet — run a metric.
          </div>
        )}
      </div>
    </div>
  );
}
