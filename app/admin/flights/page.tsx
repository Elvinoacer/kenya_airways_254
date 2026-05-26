"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AIRPORTS } from "@/lib/airports";
import { ROUTE_CONFIGS, getRouteConfig } from "@/lib/route-config";

type Flight = {
  id: string;
  flight_number: string;
  origin: string;
  destination: string;
  departure_time: string | Date | null;
  arrival_time: string | Date | null;
  basePrice?: number | null;
  priceKES?: number | null;
  price_economy?: number | null;
  price_business?: number | null;
  price_first?: number | null;
  routeImage?: string | null;
  routeTitle?: string | null;
  aircraft?: string | null;
  is_active?: number;
  is_archived?: number;
};

type FlightForm = {
  routeKey?: string;
  flight_number?: string;
  origin?: string;
  destination?: string;
  departure_time?: string;
  arrival_time?: string;
  price_economy?: number;
  price_business?: number;
  price_first?: number;
  aircraft?: string;
  terminal?: string;
};

export default function FlightsAdminPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FlightForm>({});

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/flights`);
    const data = await res.json();
    setFlights(data.flights || []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const formatDateTime = (value: string | Date | null | undefined) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
  };

  const formatPrice = (value: number | string | null | undefined) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount.toLocaleString() : "—";
  };
  const selectedRoute = getRouteConfig(form.origin, form.destination);

  function applyRoute(key: string) {
    const route = ROUTE_CONFIGS.find((item) => item.key === key);
    if (!route) {
      setForm({ ...form, routeKey: "" });
      return;
    }
    setForm({
      ...form,
      routeKey: route.key,
      origin: route.origin,
      destination: route.destination,
      price_economy: form.price_economy || route.basePrice,
      aircraft: form.aircraft || route.aircraft,
      terminal: form.terminal || route.terminal,
    });
  }

  return (
    <div className="text-[#1A1A1A]">
      <header className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-6 lg:px-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Flight Operations</div>
            <h1 className="text-3xl font-black text-[#1A1A1A]">Manage Flights</h1>
            <p className="text-sm text-[#5e3f3c] mt-2 max-w-2xl">
              Create new flights, adjust schedules, set pricing, and manage fleet assignments.
            </p>
          </div>
        </div>
      </header>

      <main className="p-6 lg:p-8 space-y-8 max-w-[1600px]">
        <section className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)]">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[#e5e2e1]">
            <div className="bg-[#fcf9f8] p-3 rounded-xl border border-[#e5e2e1]">
              <span className="material-symbols-outlined text-primary text-[24px]">add_task</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1A1A1A]">Create New Flight</h2>
              <p className="text-sm text-[#5e3f3c]">Enter flight details and pricing information.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-2">
            <div className="md:col-span-2 xl:col-span-4 grid lg:grid-cols-[1fr_280px] gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">
                  Configured Route
                </label>
                <select
                  value={form.routeKey || selectedRoute?.key || ""}
                  onChange={(e) => applyRoute(e.target.value)}
                  className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                >
                  <option value="">Choose a route template</option>
                  {ROUTE_CONFIGS.map((route) => (
                    <option key={route.key} value={route.key}>
                      {route.title} ({route.key})
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs font-medium text-[#5e3f3c]">
                  Edit route templates and images in <code>lib/route-config.ts</code>.
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-[#e5e2e1] bg-[#fcf9f8] min-h-[112px]">
                {selectedRoute ? (
                  <div className="relative h-full min-h-[112px]">
                    <img
                      src={selectedRoute.image}
                      alt={selectedRoute.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/35" />
                    <div className="absolute left-4 right-4 bottom-3">
                      <div className="text-xs font-black uppercase tracking-widest text-white/75">
                        {selectedRoute.key}
                      </div>
                      <div className="text-lg font-black text-white">{selectedRoute.title}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full min-h-[112px] items-center justify-center px-4 text-center text-sm font-semibold text-[#5e3f3c]">
                    Route image preview
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">
                Flight Number
              </label>
              <input
                value={form.flight_number || ""}
                onChange={(e) => setForm({ ...form, flight_number: e.target.value })}
                placeholder="e.g. KQ100"
                className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Origin</label>
              <select
                value={form.origin || ""}
                onChange={(e) => setForm({ ...form, origin: e.target.value, routeKey: "" })}
                className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm uppercase"
              >
                <option value="">Select origin</option>
                {AIRPORTS.map((airport) => (
                  <option key={airport.iata} value={airport.iata}>
                    {airport.city} ({airport.iata})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">
                Destination
              </label>
              <select
                value={form.destination || ""}
                onChange={(e) => setForm({ ...form, destination: e.target.value, routeKey: "" })}
                className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm uppercase"
              >
                <option value="">Select destination</option>
                {AIRPORTS.map((airport) => (
                  <option key={airport.iata} value={airport.iata}>
                    {airport.city} ({airport.iata})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">
                Departure Time
              </label>
              <input
                type="datetime-local"
                value={form.departure_time || ""}
                onChange={(e) => setForm({ ...form, departure_time: e.target.value })}
                className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">
                Arrival Time
              </label>
              <input
                type="datetime-local"
                value={form.arrival_time || ""}
                onChange={(e) => setForm({ ...form, arrival_time: e.target.value })}
                className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">
                Economy Price
              </label>
              <input
                type="number"
                value={form.price_economy || ""}
                onChange={(e) => setForm({ ...form, price_economy: Number(e.target.value) })}
                placeholder="Amount in KES"
                className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">
                Business Price
              </label>
              <input
                type="number"
                value={form.price_business || ""}
                onChange={(e) => setForm({ ...form, price_business: Number(e.target.value) })}
                placeholder="Amount in KES"
                className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">
                First Class Price
              </label>
              <input
                type="number"
                value={form.price_first || ""}
                onChange={(e) => setForm({ ...form, price_first: Number(e.target.value) })}
                placeholder="Amount in KES"
                className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">
                Aircraft
              </label>
              <input
                value={form.aircraft || selectedRoute?.aircraft || ""}
                onChange={(e) => setForm({ ...form, aircraft: e.target.value })}
                placeholder="Boeing 787 Dreamliner"
                className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">
                Terminal
              </label>
              <input
                value={form.terminal || selectedRoute?.terminal || ""}
                onChange={(e) => setForm({ ...form, terminal: e.target.value })}
                placeholder="1A"
                className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-[#e5e2e1]">
            <button
              onClick={create}
              className="bg-primary hover:bg-[#e71520] text-white font-bold rounded-xl px-8 py-3 transition-colors shadow-[0_4px_12px_rgba(231,21,32,0.2)] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              disabled={creating}
            >
              {creating ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  Create Flight
                </>
              )}
            </button>
            <button
              onClick={() => setForm({})}
              className="border border-[#e5e2e1] text-[#1A1A1A] font-bold hover:bg-[#fcf9f8] transition-colors rounded-xl px-8 py-3 cursor-pointer"
            >
              Reset Form
            </button>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-[#e5e2e1] shadow-[0_8px_32px_rgba(13,13,13,0.06)] overflow-hidden">
          <div className="p-6 border-b border-[#e5e2e1] flex items-center justify-between bg-[#fcf9f8]">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#5e3f3c] text-[24px]">list_alt</span>
              <h2 className="text-xl font-bold text-[#1A1A1A]">Existing Flights</h2>
            </div>
            <div className="text-xs font-bold text-[#5e3f3c] bg-white px-3 py-1.5 rounded-lg border border-[#e5e2e1]">
              {flights.length} total
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : flights.length === 0 ? (
            <div className="p-12 text-center bg-[#fcf9f8]">
              <span className="material-symbols-outlined text-[#5e3f3c] text-5xl mb-4">flight_takeoff</span>
              <div className="text-[#1A1A1A] font-bold text-lg mb-1">No Flights Found</div>
              <p className="text-[#5e3f3c]">There are no flights currently scheduled in the system.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[11px] font-bold uppercase tracking-widest text-[#5e3f3c] bg-white border-b border-[#e5e2e1]">
                  <tr>
                    <th className="px-6 py-4">Flight</th>
                    <th className="px-6 py-4">Route</th>
                    <th className="px-6 py-4">Dep / Arr</th>
                    <th className="px-6 py-4">Pricing (KES)</th>
                    <th className="px-6 py-4">State</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e2e1] bg-white">
                  {flights.map((f) => (
                    <tr key={f.id} className="hover:bg-[#fcf9f8] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#1A1A1A] text-base">{f.flight_number}</div>
                        <Link
                          href={`/admin/flights/${f.id}/seats`}
                          className="text-xs font-bold text-primary hover:underline mt-1 flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">airline_seat_recline_normal</span>
                          Seat Map
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {f.routeImage && (
                            <img
                              src={f.routeImage}
                              alt={f.routeTitle || `${f.origin} to ${f.destination}`}
                              className="h-12 w-16 rounded-lg object-cover border border-[#e5e2e1]"
                            />
                          )}
                          <div>
                            <div className="flex items-center gap-2 font-mono text-[#1A1A1A]">
                              <span className="font-bold">{f.origin}</span>
                              <span className="material-symbols-outlined text-[#5e3f3c] text-[16px]">arrow_forward</span>
                              <span className="font-bold">{f.destination}</span>
                            </div>
                            {f.routeTitle && <div className="mt-1 text-xs font-semibold text-[#5e3f3c]">{f.routeTitle}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[#1A1A1A] font-medium">{formatDateTime(f.departure_time)}</div>
                        <div className="text-[#5e3f3c] text-xs mt-1">{formatDateTime(f.arrival_time)}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-[#5e3f3c] space-y-1">
                        <div>
                          <span className="font-bold text-[#1A1A1A]">Base:</span>{" "}
                          {formatPrice(f.basePrice ?? f.priceKES ?? f.price_economy)}
                        </div>
                        <div>
                          <span className="font-bold text-[#1A1A1A]">E:</span>{" "}
                          {formatPrice(f.price_economy ?? f.basePrice ?? f.priceKES)}
                        </div>
                        <div>
                          <span className="font-bold text-[#1A1A1A]">B:</span>{" "}
                          {formatPrice(f.price_business ?? f.basePrice ?? f.priceKES)}
                        </div>
                        <div>
                          <span className="font-bold text-[#1A1A1A]">F:</span>{" "}
                          {formatPrice(f.price_first ?? f.basePrice ?? f.priceKES)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${
                            f.is_archived
                              ? "bg-slate-100 text-slate-600 border-slate-200"
                              : f.is_active
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-red-50 text-[#c8102e] border-red-200"
                          }`}
                        >
                          {f.is_archived ? "Archived" : f.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            className="bg-white border border-[#e5e2e1] hover:bg-[#fcf9f8] text-[#1A1A1A] rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                            onClick={() => action(f.id, "duplicate")}
                            title="Duplicate"
                          >
                            <span className="material-symbols-outlined text-[18px]">content_copy</span>
                          </button>

                          {!f.is_archived && !f.is_active && (
                            <button
                              className="bg-green-50 border border-green-200 hover:bg-green-100 text-green-700 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                              onClick={() => action(f.id, "activate")}
                              title="Activate"
                            >
                              <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            </button>
                          )}

                          {!f.is_archived && f.is_active && (
                            <button
                              className="bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                              onClick={() => action(f.id, "deactivate")}
                              title="Deactivate"
                            >
                              <span className="material-symbols-outlined text-[18px]">pause_circle</span>
                            </button>
                          )}

                          {!f.is_archived && (
                            <button
                              className="bg-red-50 border border-red-200 hover:bg-red-100 text-[#c8102e] rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                              onClick={() => action(f.id, "archive")}
                              title="Archive"
                            >
                              <span className="material-symbols-outlined text-[18px]">archive</span>
                            </button>
                          )}
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
