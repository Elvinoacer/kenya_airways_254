"use client";
import React, { useEffect, useState } from "react";
import VirtualizedList from "@/app/ui/VirtualizedList";
import { useToast } from "@/app/ClientProviders";

export default function AdminMetricsPage() {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin/metrics")
      .then((r) => r.json())
      .then((j) => setMetrics(j.metrics || []))
      .catch((e) => {
        console.error(e);
        toast.push({ message: "Failed to load metrics", tone: "error" });
      })
      .finally(() => setLoading(false));
  }, [toast]);

  function tryParseJson(str: string) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  return (
    <div className="text-[#1A1A1A] h-screen flex flex-col">
      <header className="bg-white border-b border-[#e5e2e1] shrink-0 z-10">
        <div className="flex items-center justify-between px-6 py-6 lg:px-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
              System Telemetry
            </div>
            <h1 className="text-3xl font-black text-[#1A1A1A]">
              RUM Metrics
            </h1>
            <p className="text-sm text-[#5e3f3c] mt-2 max-w-2xl">
              Real User Monitoring data, performance analytics, and system telemetry logs.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-black text-[#1A1A1A]">{metrics.length}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#5e3f3c]">Data Points</div>
            </div>
            <button 
              className="bg-[#fcf9f8] border border-[#e5e2e1] hover:bg-white text-[#1A1A1A] w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm cursor-pointer"
              onClick={() => {
                setLoading(true);
                fetch("/api/admin/metrics")
                  .then(r => r.json())
                  .then(j => setMetrics(j.metrics || []))
                  .finally(() => setLoading(false));
              }}
            >
              <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-6 lg:p-8 flex justify-center bg-slate-50">
        <div className="w-full max-w-[1200px] bg-white rounded-3xl border border-[#e5e2e1] shadow-[0_8px_32px_rgba(13,13,13,0.06)] flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-[#e5e2e1] bg-[#fcf9f8] flex items-center justify-between shrink-0">
            <h2 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#5e3f3c] text-[18px]">query_stats</span>
              Telemetry Stream
            </h2>
          </div>
          
          <div className="flex-1 relative bg-white">
            {metrics.length > 0 ? (
              <VirtualizedList
                items={metrics}
                rowHeight={100}
                height={typeof window !== 'undefined' ? window.innerHeight - 300 : 600}
                renderItem={(m) => {
                  const parsed = tryParseJson(m.payload_json);
                  return (
                    <div className="px-4 py-2">
                      <div className="p-4 bg-white border border-[#e5e2e1] rounded-2xl shadow-[0_4px_12px_rgba(13,13,13,0.02)] hover:border-primary/30 transition-colors flex flex-col justify-center h-full">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-bold text-[#1A1A1A] flex items-center gap-2 line-clamp-1">
                            <span className="material-symbols-outlined text-primary text-[16px]">link</span>
                            {m.url || "Unknown Origin"}
                          </div>
                          <div className="text-[10px] font-mono text-[#5e3f3c] bg-[#fcf9f8] px-2 py-1 rounded border border-[#e5e2e1]">
                            {new Date(m.received_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-xs font-mono text-[#5e3f3c] truncate bg-slate-50 p-2 rounded-lg border border-slate-100">
                          {parsed ? (
                            <span className="text-slate-700">{JSON.stringify(parsed)}</span>
                          ) : (
                            m.payload_json
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
            ) : !loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[#5e3f3c]">
                <span className="material-symbols-outlined text-5xl mb-4 opacity-30">analytics</span>
                <div className="text-lg font-bold text-[#1A1A1A]">No Telemetry Data</div>
                <p className="text-sm">There are no metrics recorded yet.</p>
              </div>
            )}
            
            {loading && metrics.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[#5e3f3c] bg-white/80 backdrop-blur-sm">
                <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <div className="text-sm font-bold">Loading metrics...</div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
