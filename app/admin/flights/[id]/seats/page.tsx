"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function FlightSeatMap({ params }: { params: { id: string } }) {
  const flightId = params.id;
  const [seats, setSeats] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [filter, setFilter] = useState<string>("");
  const [seatClass, setSeatClass] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const query = new URLSearchParams();
    query.set("flightId", flightId);
    if (seatClass) query.set("class", seatClass);
    if (filter) query.set("filter", filter);
    const res = await fetch(`/api/seats/map?${query.toString()}`);
    const data = await res.json();
    setSeats(data.seats || []);
    setSummary(data.summary || {});
    setLoading(false);
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
    <div className="text-[#1A1A1A]">
      <header className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-6 lg:px-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/admin/flights" className="text-[#5e3f3c] hover:text-primary transition-colors flex items-center">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span className="text-xs font-bold uppercase tracking-widest ml-1">Flights</span>
              </Link>
            </div>
            <h1 className="text-3xl font-black text-[#1A1A1A] flex items-center gap-3">
              Seat Map
              <span className="text-xl font-bold text-[#5e3f3c] bg-[#fcf9f8] px-3 py-1 rounded-lg border border-[#e5e2e1] font-mono">
                {flightId.substring(0, 8)}...
              </span>
            </h1>
            <p className="text-sm text-[#5e3f3c] mt-2 max-w-2xl">
              Manage seating inventory, lock seats, and view occupancy.
            </p>
          </div>
        </div>
      </header>

      <main className="p-6 lg:p-8 space-y-8 max-w-[1600px]">
        <section className="bg-white rounded-3xl border border-[#e5e2e1] p-6 lg:p-8 shadow-[0_8px_32px_rgba(13,13,13,0.06)]">
          <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between mb-8 pb-6 border-b border-[#e5e2e1]">
            <div className="flex gap-4 items-center flex-wrap">
              <div className="bg-[#fcf9f8] border border-[#e5e2e1] rounded-2xl p-4 text-center min-w-[100px]">
                <div className="text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Total</div>
                <div className="text-2xl font-black text-[#1A1A1A]">{summary.total || 0}</div>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center min-w-[100px]">
                <div className="text-xs font-bold uppercase tracking-widest text-green-700 mb-1">Available</div>
                <div className="text-2xl font-black text-green-700">{summary.available || 0}</div>
              </div>
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 text-center min-w-[100px]">
                <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Occupied</div>
                <div className="text-2xl font-black text-primary">{summary.occupied || 0}</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center min-w-[100px]">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-1">Locked</div>
                <div className="text-2xl font-black text-slate-700">{summary.locked || 0}</div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5e3f3c] text-[18px]">
                  airline_seat_recline_normal
                </span>
                <select
                  value={seatClass}
                  onChange={(e) => {
                    setSeatClass(e.target.value);
                    load();
                  }}
                  className="pl-10 pr-8 py-2.5 bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl text-sm font-bold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                >
                  <option value="">All Classes</option>
                  <option value="ECONOMY">Economy</option>
                  <option value="BUSINESS">Business</option>
                  <option value="FIRST">First Class</option>
                </select>
              </div>

              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5e3f3c] text-[18px]">
                  filter_list
                </span>
                <select
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    load();
                  }}
                  className="pl-10 pr-8 py-2.5 bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl text-sm font-bold text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                >
                  <option value="">No Filter</option>
                  <option value="window">Window Seats</option>
                  <option value="aisle">Aisle Seats</option>
                  <option value="accessible">Accessible</option>
                  <option value="extra_legroom">Extra Legroom</option>
                </select>
              </div>
            </div>
          </div>

          {loading && seats.length === 0 ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : seats.length === 0 ? (
            <div className="p-12 text-center bg-[#fcf9f8] rounded-2xl border border-dashed border-[#e5e2e1]">
              <span className="material-symbols-outlined text-[#5e3f3c] text-4xl mb-3">event_seat</span>
              <div className="font-bold text-[#1A1A1A] text-lg">No Seats Found</div>
              <p className="text-[#5e3f3c] mt-1">Try adjusting your filters or check if seats are generated for this flight.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
              {seats.map((s) => {
                const isOccupied = s.is_occupied;
                const isLocked = s.is_locked;
                
                let bgColor = "bg-green-50 border-green-200 hover:border-green-400";
                let textColor = "text-green-800";
                let iconColor = "text-green-500";
                
                if (isOccupied) {
                  bgColor = "bg-primary/5 border-primary/20";
                  textColor = "text-primary";
                  iconColor = "text-primary/50";
                } else if (isLocked) {
                  bgColor = "bg-slate-50 border-slate-300";
                  textColor = "text-slate-600";
                  iconColor = "text-slate-400";
                }

                return (
                  <div
                    key={s.id}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${bgColor} relative group overflow-hidden`}
                  >
                    <span className={`material-symbols-outlined absolute -right-2 -bottom-2 text-[48px] opacity-20 ${iconColor}`}>
                      airline_seat_recline_normal
                    </span>
                    
                    <div className={`font-black text-lg ${textColor} relative z-10`}>{s.seat_number}</div>
                    <div className={`text-[9px] font-bold uppercase tracking-widest ${textColor} opacity-70 relative z-10`}>
                      {s.seat_class?.substring(0, 3)}
                    </div>
                    
                    <div className="mt-2 w-full relative z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="w-full bg-white border border-[#e5e2e1] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] rounded px-2 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors shadow-sm disabled:opacity-0"
                        onClick={() => tryLock(s.id)}
                        disabled={isOccupied || isLocked}
                      >
                        Lock
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
