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

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">RUM Metrics</h1>
      {loading && <div>Loading...</div>}
      <VirtualizedList
        items={metrics}
        rowHeight={80}
        height={600}
        renderItem={(m) => (
          <div className="p-2 border-b">
            <div className="text-sm text-slate-600">
              {m.received_at} — {m.url}
            </div>
            <div className="text-xs text-slate-800 truncate">
              {m.payload_json}
            </div>
          </div>
        )}
      />
    </main>
  );
}
