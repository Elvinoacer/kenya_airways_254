"use client";

import React, { useEffect, useState } from "react";

export default function FlightSeatMap({ params }: { params: { id: string } }) {
  const flightId = params.id;
  const [seats, setSeats] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [filter, setFilter] = useState<string>("");
  const [seatClass, setSeatClass] = useState<string>("");

  async function load() {
    const query = new URLSearchParams();
    query.set("flightId", flightId);
    if (seatClass) query.set("class", seatClass);
    if (filter) query.set("filter", filter);
    const res = await fetch(`/api/seats/map?${query.toString()}`);
    const data = await res.json();
    setSeats(data.seats || []);
    setSummary(data.summary || {});
  }

  useEffect(() => {
    load();
  }, [flightId]);

  async function tryLock(seatId: string) {
    const res = await fetch("/api/seats/lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatId, flightId }),
    });
    if (res.ok) alert("Locked");
    else alert("Failed to lock");
    load();
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Seat map — {flightId}</h1>
      <div className="flex gap-2 items-center mb-3">
        <div className="text-sm">
          Total: {summary.total} — Occupied: {summary.occupied} — Locked:{" "}
          {summary.locked} — Available: {summary.available}
        </div>
        <select
          value={seatClass}
          onChange={(e) => {
            setSeatClass(e.target.value);
            load();
          }}
          className="border rounded p-1 text-sm"
        >
          <option value="">All classes</option>
          <option value="ECONOMY">Economy</option>
          <option value="BUSINESS">Business</option>
          <option value="FIRST">First</option>
        </select>
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            load();
          }}
          className="border rounded p-1 text-sm"
        >
          <option value="">No filter</option>
          <option value="window">Window</option>
          <option value="aisle">Aisle</option>
          <option value="accessible">Accessible</option>
          <option value="extra_legroom">Extra legroom</option>
        </select>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {seats.map((s) => (
          <div
            key={s.id}
            className={`p-2 border rounded text-sm ${s.is_occupied ? "bg-red-100" : ""}`}
          >
            <div className="font-medium">{s.seat_number}</div>
            <div className="text-xs">{s.seat_class}</div>
            <div className="mt-2">
              <button
                className="rounded border px-2 py-1 text-xs"
                onClick={() => tryLock(s.id)}
                disabled={s.is_occupied}
              >
                Lock
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
