"use client";

import React, { useEffect, useState } from "react";

export default function AdminSchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [flights, setFlights] = useState<any[]>([]);
  const [aircraft, setAircraft] = useState<any[]>([]);
  const [gates, setGates] = useState<any[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [sRes, fRes] = await Promise.all([
      fetch("/api/schedules"),
      fetch("/api/flights"),
    ]);
    const sData = await sRes.json();
    const fData = await fRes.json();
    setSchedules(sData.schedules || []);
    setFlights(fData.flights || []);
    
    // load aircraft & gates
    const a = await (
      await fetch("/api/admin/aircraft").catch(() => new Response("[]"))
    )
      .json()
      .catch(() => []);
    setAircraft(a || []);
    const g = await (
      await fetch("/api/admin/gates").catch(() => new Response("[]"))
    )
      .json()
      .catch(() => []);
    setGates(g || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createSchedule() {
    const res = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({});
      await load();
    }
  }

  async function setStatus(scheduleId: string, status: string) {
    const reason =
      status === "DELAYED"
        ? window.prompt("Reason for delay (optional):")
        : window.prompt("Reason (optional):");
    let delay_minutes: number | undefined = undefined;
    if (status === "DELAYED") {
      const val = window.prompt("Delay minutes (numeric):", "0");
      delay_minutes = val ? Number(val) : 0;
    }
    await fetch(`/api/schedules/${scheduleId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason, delay_minutes }),
    });
    await load();
  }

  return (
    <div className="text-[#1A1A1A]">
      <header className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-6 lg:px-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
              Flight Operations
            </div>
            <h1 className="text-3xl font-black text-[#1A1A1A]">
              Dispatch & Scheduling
            </h1>
            <p className="text-sm text-[#5e3f3c] mt-2 max-w-2xl">
              Assign aircraft, allocate gates, and manage real-time departure statuses.
            </p>
          </div>
          <button 
            onClick={load}
            className="bg-[#fcf9f8] border border-[#e5e2e1] hover:bg-white text-[#1A1A1A] w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[20px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
      </header>

      <main className="p-6 lg:p-8 space-y-8 max-w-[1600px]">
        {/* Create Schedule Form */}
        <section className="bg-white rounded-3xl border border-[#e5e2e1] p-6 lg:p-8 shadow-[0_8px_32px_rgba(13,13,13,0.06)] animate-in fade-in">
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">add_task</span>
            Draft New Schedule
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Target Flight</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5e3f3c] pointer-events-none">flight</span>
                <select
                  value={form.flight_id || ""}
                  onChange={(e) => setForm({ ...form, flight_id: e.target.value })}
                  className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium appearance-none"
                >
                  <option value="">Select designated flight</option>
                  {flights.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.flight_number} — {f.origin} to {f.destination}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Aircraft Allocation</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5e3f3c] pointer-events-none">airlines</span>
                <select
                  value={form.aircraft_id || ""}
                  onChange={(e) => setForm({ ...form, aircraft_id: e.target.value })}
                  className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium appearance-none"
                >
                  <option value="">Select tail number</option>
                  {aircraft.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.registration} ({a.model})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Gate Assignment</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5e3f3c] pointer-events-none">door_front</span>
                <select
                  value={form.gate_id || ""}
                  onChange={(e) => setForm({ ...form, gate_id: e.target.value })}
                  className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium appearance-none"
                >
                  <option value="">Select departure gate</option>
                  {gates.map((g: any) => (
                    <option key={g.id} value={g.id}>
                      {g.gate_code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Boarding Time</label>
              <input
                type="datetime-local"
                value={form.boarding_time || ""}
                onChange={(e) => setForm({ ...form, boarding_time: e.target.value })}
                className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Departure Time</label>
              <input
                type="datetime-local"
                value={form.departure_time || ""}
                onChange={(e) => setForm({ ...form, departure_time: e.target.value })}
                className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Arrival Time</label>
              <input
                type="datetime-local"
                value={form.arrival_time || ""}
                onChange={(e) => setForm({ ...form, arrival_time: e.target.value })}
                className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium"
              />
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-[#e5e2e1] flex justify-end">
            <button
              onClick={createSchedule}
              className="bg-primary hover:bg-[#e71520] text-white font-bold rounded-xl px-8 py-3 transition-colors shadow-[0_4px_12px_rgba(231,21,32,0.2)] flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
              Commit Schedule
            </button>
          </div>
        </section>

        {/* Active Schedules Table */}
        <section className="bg-white rounded-3xl border border-[#e5e2e1] shadow-[0_8px_32px_rgba(13,13,13,0.06)] overflow-hidden">
          <div className="p-6 border-b border-[#e5e2e1] bg-[#fcf9f8] flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#5e3f3c]">calendar_month</span>
              Active Dispatch Board
            </h2>
            <div className="text-xs font-bold text-[#5e3f3c] bg-white px-3 py-1.5 rounded-lg border border-[#e5e2e1]">
              {schedules.length} schedules
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] font-bold uppercase tracking-widest text-[#5e3f3c] bg-white border-b border-[#e5e2e1]">
                <tr>
                  <th className="px-6 py-4">Flight & Status</th>
                  <th className="px-6 py-4">Times (Local)</th>
                  <th className="px-6 py-4">Resources</th>
                  <th className="px-6 py-4 text-right">Dispatch Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e2e1] bg-white">
                {loading && schedules.length === 0 ? (
                   <tr>
                     <td colSpan={4} className="px-6 py-12 text-center">
                       <div className="flex justify-center">
                         <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                       </div>
                     </td>
                   </tr>
                ) : schedules.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-[#5e3f3c]">
                      No active schedules.
                    </td>
                  </tr>
                ) : (
                  schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-[#fcf9f8] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-primary text-lg flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#5e3f3c] text-[20px]">flight_takeoff</span>
                          {s.flight_number}
                        </div>
                        <div className="mt-2 inline-block">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${
                            s.status === "SCHEDULED" ? "bg-slate-100 text-slate-700 border-slate-200" :
                            s.status === "BOARDING" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            s.status === "DEPARTED" ? "bg-purple-50 text-purple-700 border-purple-200" :
                            s.status === "ARRIVED" ? "bg-green-50 text-green-700 border-green-200" :
                            s.status === "DELAYED" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-red-50 text-[#c8102e] border-red-200"
                          }`}>
                            {s.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-[#1A1A1A]">
                        <div className="flex gap-4">
                          <div>
                            <div className="text-[10px] font-bold text-[#5e3f3c] uppercase mb-0.5">Departs</div>
                            {new Date(s.departure_time).toLocaleString()}
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-[#5e3f3c] uppercase mb-0.5">Arrives</div>
                            {new Date(s.arrival_time).toLocaleString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-xs text-[#1A1A1A] flex items-center gap-1.5 font-medium">
                            <span className="material-symbols-outlined text-[14px] text-[#5e3f3c]">door_front</span>
                            Gate {s.gate_code || "TBD"}
                          </div>
                          <div className="text-xs text-[#1A1A1A] flex items-center gap-1.5 font-medium">
                            <span className="material-symbols-outlined text-[14px] text-[#5e3f3c]">airlines</span>
                            {s.aircraft_registration || "Unassigned Tail"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap max-w-[280px] ml-auto">
                          {s.status === "SCHEDULED" && (
                            <button
                              className="px-2 py-1 bg-white border border-[#e5e2e1] hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-[#1A1A1A] text-[10px] font-bold rounded transition-colors"
                              onClick={() => setStatus(s.id, "BOARDING")}
                            >
                              Boarding
                            </button>
                          )}
                          {["SCHEDULED", "BOARDING", "DELAYED"].includes(s.status) && (
                            <button
                              className="px-2 py-1 bg-white border border-[#e5e2e1] hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 text-[#1A1A1A] text-[10px] font-bold rounded transition-colors"
                              onClick={() => setStatus(s.id, "DEPARTED")}
                            >
                              Departed
                            </button>
                          )}
                          {s.status === "DEPARTED" && (
                            <button
                              className="px-2 py-1 bg-white border border-[#e5e2e1] hover:bg-green-50 hover:text-green-700 hover:border-green-200 text-[#1A1A1A] text-[10px] font-bold rounded transition-colors"
                              onClick={() => setStatus(s.id, "ARRIVED")}
                            >
                              Arrived
                            </button>
                          )}
                          {!["CANCELLED", "ARRIVED"].includes(s.status) && (
                            <button
                              className="px-2 py-1 bg-white border border-[#e5e2e1] hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 text-[#1A1A1A] text-[10px] font-bold rounded transition-colors"
                              onClick={() => setStatus(s.id, "DELAYED")}
                            >
                              Delay
                            </button>
                          )}
                          {!["CANCELLED", "ARRIVED"].includes(s.status) && (
                            <button
                              className="px-2 py-1 bg-white border border-[#e5e2e1] hover:bg-red-50 hover:text-[#c8102e] hover:border-red-200 text-[#1A1A1A] text-[10px] font-bold rounded transition-colors"
                              onClick={() => setStatus(s.id, "CANCELLED")}
                            >
                              Cancel
                            </button>
                          )}
                          {["DEPARTED"].includes(s.status) && (
                            <button
                              className="px-2 py-1 bg-white border border-[#e5e2e1] hover:bg-slate-100 text-[#1A1A1A] text-[10px] font-bold rounded transition-colors"
                              onClick={() => setStatus(s.id, "DIVERTED")}
                            >
                              Divert
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
