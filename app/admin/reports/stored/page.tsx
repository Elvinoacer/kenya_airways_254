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
    window.open(`/api/reports/stored/${id}`, "_blank");
  }

  async function remove(id: string) {
    if (!confirm("Delete stored report?")) return;
    const res = await fetch(`/api/reports/stored/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  return (
    <div className="text-[#1A1A1A]">
      <header className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-6 lg:px-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
              Archive
            </div>
            <h1 className="text-3xl font-black text-[#1A1A1A]">
              Stored Reports
            </h1>
            <p className="text-sm text-[#5e3f3c] mt-2 max-w-2xl">
              Browse, download, and manage previously generated report files.
            </p>
          </div>
          <button 
            onClick={load}
            className="flex items-center gap-2 bg-[#fcf9f8] border border-[#e5e2e1] hover:bg-white text-[#1A1A1A] font-bold rounded-xl px-5 py-2.5 transition-colors shadow-sm"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
            Refresh
          </button>
        </div>
      </header>

      <main className="p-6 lg:p-8 max-w-[1200px]">
        <section className="bg-white rounded-3xl border border-[#e5e2e1] shadow-[0_8px_32px_rgba(13,13,13,0.06)] overflow-hidden">
          <div className="p-6 border-b border-[#e5e2e1] bg-[#fcf9f8] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#5e3f3c]">folder_open</span>
              Report Archive
            </h2>
            <span className="text-xs font-bold text-[#5e3f3c] bg-white px-3 py-1.5 rounded-lg border border-[#e5e2e1]">
              {items.length} files
            </span>
          </div>
          
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center bg-[#fcf9f8]">
              <span className="material-symbols-outlined text-5xl text-[#5e3f3c] mb-4 opacity-30">folder_off</span>
              <div className="font-bold text-[#1A1A1A] text-lg mb-1">No Stored Reports</div>
              <p className="text-sm text-[#5e3f3c]">Generated reports will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[11px] font-bold uppercase tracking-widest text-[#5e3f3c] bg-white border-b border-[#e5e2e1]">
                  <tr>
                    <th className="px-6 py-4">File</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Format</th>
                    <th className="px-6 py-4">Generated</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e2e1] bg-white">
                  {items.map((it) => (
                    <tr key={it.id} className="hover:bg-[#fcf9f8] transition-colors group">
                      <td className="px-6 py-4 font-bold text-[#1A1A1A] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#5e3f3c] text-[18px]">description</span>
                        {it.file_path ? it.file_path.split("/").pop() : it.id}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-[#fcf9f8] border border-[#e5e2e1] text-[#5e3f3c]">
                          {it.report_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-white border border-[#e5e2e1] text-[#5e3f3c]">
                          {it.file_format}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-[#5e3f3c]">{it.generated_at}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="bg-white border border-[#e5e2e1] hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] text-[#1A1A1A] rounded-lg px-3 py-1.5 text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                            onClick={() => download(it.id)}
                          >
                            <span className="material-symbols-outlined text-[16px]">download</span>
                            Download
                          </button>
                          <button
                            className="bg-red-50 border border-red-200 hover:bg-red-100 text-[#c8102e] rounded-lg px-2 py-1.5 transition-colors cursor-pointer"
                            onClick={() => remove(it.id)}
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
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
