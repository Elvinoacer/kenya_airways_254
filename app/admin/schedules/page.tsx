"use client";

import React, { useEffect, useState } from "react";

export default function AdminSchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [flights, setFlights] = useState<any[]>([]);
  const [aircraft, setAircraft] = useState<any[]>([]);
  const [gates, setGates] = useState<any[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});

  async function load() {
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
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Scheduling</h1>
      <section className="mt-4">
        <h2 className="font-medium">Create schedule</h2>
        <div className="grid md:grid-cols-3 gap-2 mt-2">
          <select
            value={form.flight_id || ""}
            onChange={(e) => setForm({ ...form, flight_id: e.target.value })}
            className="border rounded p-2"
          >
            <option value="">Select flight</option>
            {flights.map((f: any) => (
              <option key={f.id} value={f.id}>
                {f.flight_number} — {f.origin}/{f.destination}
              </option>
            ))}
          </select>
          <input
            value={form.departure_time || ""}
            onChange={(e) =>
              setForm({ ...form, departure_time: e.target.value })
            }
            placeholder="Departure ISO"
            className="border rounded p-2"
          />
          <input
            value={form.arrival_time || ""}
            onChange={(e) => setForm({ ...form, arrival_time: e.target.value })}
            placeholder="Arrival ISO"
            className="border rounded p-2"
          />
          <input
            value={form.boarding_time || ""}
            onChange={(e) =>
              setForm({ ...form, boarding_time: e.target.value })
            }
            placeholder="Boarding ISO"
            className="border rounded p-2"
          />
          <select
            value={form.aircraft_id || ""}
            onChange={(e) => setForm({ ...form, aircraft_id: e.target.value })}
            className="border rounded p-2"
          >
            <option value="">Select aircraft</option>
            {aircraft.map((a: any) => (
              <option key={a.id} value={a.id}>
                {a.registration} ({a.model})
              </option>
            ))}
          </select>
          <select
            value={form.gate_id || ""}
            onChange={(e) => setForm({ ...form, gate_id: e.target.value })}
            className="border rounded p-2"
          >
            <option value="">Select gate</option>
            {gates.map((g: any) => (
              <option key={g.id} value={g.id}>
                {g.gate_code}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button
              onClick={createSchedule}
              className="bg-blue-600 text-white rounded px-4 py-2"
            >
              Create
            </button>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-medium">Upcoming schedules</h2>
        <div className="mt-3">
          {schedules.map((s) => (
            <div key={s.id} className="border p-3 mb-2 rounded">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold">{s.flight_number}</div>
                  <div className="text-sm">
                    Dep: {new Date(s.departure_time).toLocaleString()} — Arr:{" "}
                    {new Date(s.arrival_time).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="text-sm">Gate: {s.gate_code || "—"}</div>
                  <div className="text-sm">
                    Aircraft: {s.aircraft_registration || "—"}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  className="rounded border px-2"
                  onClick={() => setStatus(s.id, "BOARDING")}
                >
                  Boarding
                </button>
                <button
                  className="rounded border px-2"
                  onClick={() => setStatus(s.id, "DELAYED")}
                >
                  Delay
                </button>
                <button
                  className="rounded border px-2"
                  onClick={() => setStatus(s.id, "DEPARTED")}
                >
                  Departed
                </button>
                <button
                  className="rounded border px-2"
                  onClick={() => setStatus(s.id, "ARRIVED")}
                >
                  Arrived
                </button>
                <button
                  className="rounded border px-2"
                  onClick={() => setStatus(s.id, "CANCELLED")}
                >
                  Cancel
                </button>
                <button
                  className="rounded border px-2"
                  onClick={() => setStatus(s.id, "DIVERTED")}
                >
                  Divert
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
