"use client";

import React, { useEffect, useRef, useState } from "react";

const METRICS = [
  { value: "revenue", label: "Revenue Analytics" },
  { value: "occupancy", label: "Flight Occupancy Analytics" },
  { value: "peak_routes", label: "Peak Route Analytics" },
  { value: "passenger_trends", label: "Passenger Trends" },
  { value: "booking_trends", label: "Booking Trends" },
  { value: "cancellations", label: "Cancellation Analytics" },
  { value: "forecast_revenue", label: "Revenue Forecasting" },
  { value: "kpis", label: "KPI Tracking" },
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
      
      // Theme colors matching new brand
      const primaryColor = "#e71520";
      const primaryBg = "rgba(231, 21, 32, 0.15)";
      
      const chart = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: METRICS.find(m => m.value === metric)?.label || metric,
              data: revenueVals,
              borderColor: primaryColor,
              backgroundColor: primaryBg,
              borderWidth: 3,
              pointBackgroundColor: "#fff",
              pointBorderColor: primaryColor,
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              fill: true,
              tension: 0.4, // smooth curves
            },
          ],
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: "#1A1A1A",
              titleColor: "#fff",
              bodyColor: "#fcf9f8",
              padding: 12,
              cornerRadius: 8,
              displayColors: false,
            }
          },
          scales: {
            x: {
              grid: {
                display: false,
              },
              ticks: {
                color: "#5e3f3c",
                font: {
                  family: "Inter, sans-serif",
                  size: 11
                }
              }
            },
            y: {
              grid: {
                color: "#e5e2e1",
              },
              ticks: {
                color: "#5e3f3c",
                font: {
                  family: "Inter, sans-serif",
                  size: 11
                }
              },
              beginAtZero: true
            }
          }
        },
      });
      (canvasRef.current as any).__chartInstance = chart;
    })();

    return () => {
      isMounted = false;
    };
  }, [data, metric]);

  return (
    <div className="text-[#1A1A1A]">
      <header className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-6 lg:px-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
              Intelligence
            </div>
            <h1 className="text-3xl font-black text-[#1A1A1A]">
              Analytics & Insights
            </h1>
            <p className="text-sm text-[#5e3f3c] mt-2 max-w-2xl">
              Query historical data, forecast revenue, and track key performance indicators.
            </p>
          </div>
        </div>
      </header>

      <main className="p-6 lg:p-8 space-y-8 max-w-[1600px]">
        {/* Controls */}
        <section className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)]">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-2">Metric Group</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5e3f3c] text-[20px] pointer-events-none">
                  query_stats
                </span>
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                  className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-bold text-[#1A1A1A] appearance-none"
                >
                  {METRICS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-2">Date Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium"
                />
                <span className="text-[#5e3f3c] font-bold">→</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium"
                />
              </div>
            </div>

            <button
              onClick={run}
              className="w-full md:w-auto bg-primary hover:bg-[#e71520] text-white font-bold rounded-xl px-8 py-3 transition-colors shadow-[0_4px_12px_rgba(231,21,32,0.2)] flex items-center justify-center gap-2 cursor-pointer h-[46px]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                  Execute Query
                </>
              )}
            </button>
          </div>
        </section>

        {/* Results */}
        <section className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)] min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-6 border-b border-[#e5e2e1] pb-4">
            <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">insights</span>
              Results: {METRICS.find(m => m.value === metric)?.label}
            </h2>
            {data && !data.error && Array.isArray(data) && (
              <span className="text-xs font-bold text-[#5e3f3c] bg-[#fcf9f8] px-3 py-1 rounded-lg border border-[#e5e2e1]">
                {data.length} Data Points
              </span>
            )}
          </div>

          <div className="flex-1">
            {loading ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-[#5e3f3c]">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <div className="text-sm font-bold">Querying Data Warehouse...</div>
                <div className="text-xs mt-1">This may take a moment depending on the time range.</div>
              </div>
            ) : data ? (
              data.error ? (
                <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-[#c8102e]">
                  <div className="font-bold flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined">error</span>
                    Query Failed
                  </div>
                  <div className="text-sm font-mono whitespace-pre-wrap">{data.error}</div>
                </div>
              ) : (
                <div className="grid gap-6">
                  {Array.isArray(data) && data.length > 0 ? (
                    <div className="h-[320px] w-full rounded-xl border border-[#e5e2e1] bg-[#fcf9f8] p-4">
                      <canvas ref={canvasRef} />
                    </div>
                  ) : Array.isArray(data) && data.length === 0 ? (
                    <div className="p-8 text-center text-[#5e3f3c] bg-[#fcf9f8] rounded-xl border border-dashed border-[#e5e2e1]">
                      <span className="material-symbols-outlined text-4xl mb-2 opacity-50">search_off</span>
                      <div className="font-bold text-[#1A1A1A] text-base">No Data Returned</div>
                      <div className="text-sm mt-1">No records match the selected metric and date range.</div>
                    </div>
                  ) : null}
                  
                  <div className="rounded-xl border border-[#e5e2e1] overflow-hidden">
                    <div className="bg-[#fcf9f8] px-4 py-2 border-b border-[#e5e2e1] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#5e3f3c]">data_object</span>
                      <span className="text-xs font-bold uppercase tracking-widest text-[#5e3f3c]">Raw JSON Payload</span>
                    </div>
                    <pre className="max-h-[300px] overflow-auto text-[11px] font-mono text-[#1A1A1A] p-4 bg-white custom-scrollbar">
                      {JSON.stringify(data, null, 2)}
                    </pre>
                  </div>
                </div>
              )
            ) : (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-[#5e3f3c] bg-[#fcf9f8] rounded-xl border border-dashed border-[#e5e2e1]">
                <span className="material-symbols-outlined text-5xl mb-3 opacity-30">monitoring</span>
                <div className="font-bold text-[#1A1A1A] text-lg mb-1">Analytics Engine Ready</div>
                <div className="text-sm text-center max-w-sm">
                  Select a metric group and date range above, then click Execute Query to analyze performance data.
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
