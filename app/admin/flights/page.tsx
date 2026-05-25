"use client";

import React, { useEffect, useState } from "react";

type Flight = {
  id: string;
  flight_number: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  price_economy: number;
  price_business: number;
  price_first: number;
  is_active?: number;
  is_archived?: number;
};

export default function FlightsAdminPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<any>({});

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/flights`);
    const data = await res.json();
    setFlights(data.flights || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    setCreating(true);
    const res = await fetch(`/api/flights`, {
      method: "POST",
      body: JSON.stringify(form),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      setForm({});
      await load();
    } else {
      console.error(await res.text());
    }
    setCreating(false);
  }

  async function action(id: string, act: string) {
    const res = await fetch(`/api/flights/${id}?action=${act}`, {
      method: "POST",
      body: "{}",
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) await load();
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Flights Admin</h1>
      <section className="mt-4 mb-6">
        <h2 className="font-medium">Create flight</h2>
        <div className="grid md:grid-cols-3 gap-2 mt-2">
          <input
            value={form.flight_number || ""}
            onChange={(e) =>
              setForm({ ...form, flight_number: e.target.value })
            }
            placeholder="Flight number"
            className="border rounded p-2"
          />
          <input
            value={form.origin || ""}
            onChange={(e) => setForm({ ...form, origin: e.target.value })}
            placeholder="Origin (IATA)"
            className="border rounded p-2"
          />
          <input
            value={form.destination || ""}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            placeholder="Destination (IATA)"
            className="border rounded p-2"
          />
          <input
            value={form.departure_time || ""}
            onChange={(e) =>
              setForm({ ...form, departure_time: e.target.value })
            }
            placeholder="Departure (ISO)"
            className="border rounded p-2"
          />
          <input
            value={form.arrival_time || ""}
            onChange={(e) => setForm({ ...form, arrival_time: e.target.value })}
            placeholder="Arrival (ISO)"
            className="border rounded p-2"
          />
          <input
            value={form.price_economy || ""}
            onChange={(e) =>
              setForm({ ...form, price_economy: Number(e.target.value) })
            }
            placeholder="Price economy"
            className="border rounded p-2"
          />
          <input
            value={form.price_business || ""}
            onChange={(e) =>
              setForm({ ...form, price_business: Number(e.target.value) })
            }
            placeholder="Price business"
            className="border rounded p-2"
          />
          <input
            value={form.price_first || ""}
            onChange={(e) =>
              setForm({ ...form, price_first: Number(e.target.value) })
            }
            placeholder="Price first"
            className="border rounded p-2"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={create}
              className="bg-blue-600 text-white rounded px-4 py-2"
              disabled={creating}
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => {
                setForm({});
              }}
              className="rounded border px-3 py-2"
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-medium">Existing flights</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <table className="w-full mt-3 border-collapse">
            <thead>
              <tr className="text-left">
                <th className="p-2">Flight</th>
                <th>Route</th>
                <th>Dep / Arr</th>
                <th>Prices</th>
                <th>State</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {flights.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="p-2">{f.flight_number}</td>
                  <td className="p-2">
                    {f.origin} → {f.destination}
                  </td>
                  <td className="p-2">
                    {new Date(f.departure_time).toLocaleString()} /{" "}
                    {new Date(f.arrival_time).toLocaleString()}
                  </td>
                  <td className="p-2">
                    E:{f.price_economy} B:{f.price_business} F:{f.price_first}
                  </td>
                  <td className="p-2">
                    {f.is_archived
                      ? "archived"
                      : f.is_active
                        ? "active"
                        : "inactive"}
                  </td>
                  <td className="p-2 flex gap-2">
                    <button
                      className="rounded border px-2"
                      onClick={() => action(f.id, "duplicate")}
                    >
                      Duplicate
                    </button>
                    <button
                      className="rounded border px-2"
                      onClick={() => action(f.id, "activate")}
                    >
                      Activate
                    </button>
                    <button
                      className="rounded border px-2"
                      onClick={() => action(f.id, "deactivate")}
                    >
                      Deactivate
                    </button>
                    <button
                      className="rounded border px-2"
                      onClick={() => action(f.id, "archive")}
                    >
                      Archive
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
