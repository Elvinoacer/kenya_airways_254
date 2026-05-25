"use client";

import React, { useEffect, useState } from "react";

export default function StoredReportsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/reports/stored");
    const json = await res.json();
    setItems(json?.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function download(id: string) {
    // open download in new tab
    window.open(`/api/reports/stored/${id}`, "_blank");
  }

  async function remove(id: string) {
    if (!confirm("Delete stored report?")) return;
    const res = await fetch(`/api/reports/stored/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Stored Reports</h1>
      {loading ? (
        <div>Loading…</div>
      ) : items.length === 0 ? (
        <div>No stored reports</div>
      ) : (
        <table className="min-w-full border">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Format</th>
              <th>Generated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="border px-2 py-1">
                  {it.file_path ? it.file_path.split("/").pop() : it.id}
                </td>
                <td className="border px-2 py-1">{it.report_type}</td>
                <td className="border px-2 py-1">{it.file_format}</td>
                <td className="border px-2 py-1">{it.generated_at}</td>
                <td className="border px-2 py-1 space-x-2">
                  <button
                    className="rounded border px-2 py-1"
                    onClick={() => download(it.id)}
                  >
                    Download
                  </button>
                  <button
                    className="rounded border px-2 py-1 text-red-600"
                    onClick={() => remove(it.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
