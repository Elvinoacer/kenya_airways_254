"use client";
import React, { Suspense, useEffect, useState } from "react";
import FlightCard from "./components/FlightCard";
import { useRouter, useSearchParams } from "next/navigation";
import { AIRPORTS } from "@/lib/airports";

type SearchParams = {
  origin?: string;
  destination?: string;
  departDate?: string;
  returnDate?: string;
  tripType?: string;
  cabin?: string;
  sort?: string;
  currency?: "USD" | "KES";
  passengers?: string;
  priceMin?: string;
  priceMax?: string;
  durationMax?: string;
  directOnly?: string;
  seatsMin?: string;
  refundable?: string;
  baggageIncluded?: string;
};

function SearchContent() {
  const [params, setParams] = useState<SearchParams>({ currency: "USD" });
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParamsHook = useSearchParams();

  useEffect(() => {
    async function doSearch() {
      if (!initialized) return;
      setLoading(true);
      setError("");
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v) qs.set(k, String(v));
      });
      // Keep URL in sync with params
      try {
        router.replace(`/search?${qs.toString()}`, { scroll: false });
      } catch (e) {
        /* ignore in environments without router support */
      }
      try {
        const res = await fetch(`/api/flights?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Search failed");
        setResults(data.results || []);
      } catch (err: any) {
        setResults([]);
        setError(err.message || "We couldn't load flights right now.");
      } finally {
        setLoading(false);
      }
    }
    doSearch();
  }, [params, initialized, router]);

  useEffect(() => {
    // initialize from URL search params on mount
    try {
      const sp = Object.fromEntries(searchParamsHook?.entries() || []);
      setParams({ currency: "USD", passengers: "1", ...sp } as any);
      setInitialized(true);
    } catch (e) {
      setInitialized(true);
    }
  }, [searchParamsHook]);

  return (
    <div className="min-h-screen bg-[#fcf9f8]">
      {/* Premium Header */}
      <div className="bg-[#410001] relative py-16 md:py-24">
        <div className="absolute inset-0 overflow-hidden">
          <img src="/images/dest_nairobi.svg" alt="Search flights" className="w-full h-full object-cover opacity-30 mix-blend-overlay" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#410001] to-transparent"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Where to next?</h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">Find and book your perfect flight with Kenya Airways.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar / Form */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-[#e5e2e1]">
              <h2 className="text-xl font-bold text-[#1A1A1A] mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">search</span>
                Find Flights
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget as HTMLFormElement);
                  const next: any = {
                    origin: String(form.get("origin") || ""),
                    destination: String(form.get("destination") || ""),
                    departDate: String(form.get("departDate") || ""),
                    returnDate: String(form.get("returnDate") || ""),
                    tripType: String(form.get("tripType") || "return"),
                    cabin: String(form.get("cabin") || ""),
                    passengers: String(form.get("passengers") || "1"),
                    sort: String(form.get("sort") || "depart"),
                    currency: String(form.get("currency") || "USD") as "USD" | "KES",
                  };
                  const priceMin = form.get("priceMin");
                  const priceMax = form.get("priceMax");
                  const durationMax = form.get("durationMax");
                  const departAfter = form.get("departAfter");
                  const departBefore = form.get("departBefore");
                  const directOnly = form.get("directOnly");
                  const maxStops = form.get("maxStops");
                  const aircraft = form.get("aircraft");
                  const seatsMin = form.get("seatsMin");
                  const refundable = form.get("refundable");
                  const baggageIncluded = form.get("baggageIncluded");
                  const mealIncluded = form.get("mealIncluded");
                  const wifiAvailable = form.get("wifiAvailable");

                  if (priceMin) next.priceMin = String(priceMin);
                  if (priceMax) next.priceMax = String(priceMax);
                  if (durationMax) next.durationMax = String(durationMax);
                  if (departAfter) next.departAfter = String(departAfter);
                  if (departBefore) next.departBefore = String(departBefore);
                  if (directOnly) next.directOnly = "true";
                  if (maxStops) next.maxStops = String(maxStops);
                  if (aircraft) next.aircraft = String(aircraft);
                  if (seatsMin) next.seatsMin = String(seatsMin);
                  if (refundable) next.refundable = "true";
                  if (baggageIncluded) next.baggageIncluded = "true";

                  setParams(next);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-[#5e3f3c] mb-1">Trip</label>
                  <select
                    name="tripType"
                    value={params.tripType || "return"}
                    onChange={(event) =>
                      setParams((current) => ({ ...current, tripType: event.target.value }))
                    }
                    className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-white"
                  >
                    <option value="return">Return</option>
                    <option value="oneway">One-way</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5e3f3c] mb-1">From</label>
                  <select
                    name="origin"
                    value={params.origin || ""}
                    onChange={(event) =>
                      setParams((current) => ({ ...current, origin: event.target.value }))
                    }
                    className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-white"
                  >
                    <option value="">Any origin</option>
                    {AIRPORTS.map((airport) => (
                      <option key={airport.iata} value={airport.iata}>
                        {airport.city} ({airport.iata})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5e3f3c] mb-1">To</label>
                  <select
                    name="destination"
                    value={params.destination || ""}
                    onChange={(event) =>
                      setParams((current) => ({ ...current, destination: event.target.value }))
                    }
                    className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-white"
                  >
                    <option value="">Any destination</option>
                    {AIRPORTS.map((airport) => (
                      <option key={airport.iata} value={airport.iata}>
                        {airport.city} ({airport.iata})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5e3f3c] mb-1">Depart</label>
                  <input name="departDate" value={params.departDate || ""} onChange={(event) => setParams((current) => ({ ...current, departDate: event.target.value }))} type="date" className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A]" />
                </div>
                {params.tripType !== "oneway" && (
                  <div>
                    <label className="block text-sm font-medium text-[#5e3f3c] mb-1">Return</label>
                    <input name="returnDate" value={params.returnDate || ""} onChange={(event) => setParams((current) => ({ ...current, returnDate: event.target.value }))} type="date" className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A]" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-[#5e3f3c] mb-1">Cabin</label>
                  <select name="cabin" value={params.cabin || ""} onChange={(event) => setParams((current) => ({ ...current, cabin: event.target.value }))} className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-white">
                    <option value="">Any cabin</option>
                    <option value="CLASS_A">Class A: Executive</option>
                    <option value="CLASS_B">Class B: Middle class</option>
                    <option value="CLASS_C">Class C: Low class</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5e3f3c] mb-1">Passengers</label>
                  <input name="passengers" value={params.passengers || "1"} onChange={(event) => setParams((current) => ({ ...current, passengers: event.target.value }))} min="1" max="9" type="number" className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#5e3f3c] mb-1">Currency</label>
                  <select
                    name="currency"
                    value={params.currency || "USD"}
                    onChange={(event) =>
                      setParams((current) => ({ ...current, currency: event.target.value as "USD" | "KES" }))
                    }
                    className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-white"
                  >
                    <option value="USD">USD</option>
                    <option value="KES">KES</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-[#e5e2e1]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-[#1A1A1A]">Filters</h3>
                    <select name="sort" value={params.sort || "depart"} onChange={(event) => setParams((current) => ({ ...current, sort: event.target.value }))} className="text-sm rounded-lg border border-[#e5e2e1] bg-white px-2 py-1 text-[#1A1A1A]">
                      <option value="depart">Earliest</option>
                      <option value="price">Lowest price</option>
                      <option value="duration">Shortest</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input name="directOnly" type="checkbox" className="w-4 h-4 text-primary focus:ring-primary border-[#e5e2e1] rounded" />
                      <span className="text-sm text-[#5e3f3c]">Direct flights only</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input name="refundable" type="checkbox" className="w-4 h-4 text-primary focus:ring-primary border-[#e5e2e1] rounded" />
                      <span className="text-sm text-[#5e3f3c]">Refundable</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input name="baggageIncluded" type="checkbox" className="w-4 h-4 text-primary focus:ring-primary border-[#e5e2e1] rounded" />
                      <span className="text-sm text-[#5e3f3c]">Baggage Included</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <input name="priceMin" placeholder="Min price" className="w-full px-3 py-2 rounded-lg border border-[#e5e2e1] text-sm text-[#1A1A1A]" />
                    <input name="priceMax" placeholder="Max price" className="w-full px-3 py-2 rounded-lg border border-[#e5e2e1] text-sm text-[#1A1A1A]" />
                    <input name="durationMax" placeholder="Max mins" className="w-full px-3 py-2 rounded-lg border border-[#e5e2e1] text-sm text-[#1A1A1A]" />
                    <input name="seatsMin" placeholder="Seats min" className="w-full px-3 py-2 rounded-lg border border-[#e5e2e1] text-sm text-[#1A1A1A]" />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-lg bg-primary text-white font-semibold hover:bg-[#e71520] transition-colors shadow-sm flex justify-center items-center gap-2"
                  >
                    Search Flights
                    <span className="material-symbols-outlined text-sm">search</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-3">
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-[#1A1A1A]">Search Results</h2>
              <div className="text-sm text-[#5e3f3c] bg-white px-4 py-2 rounded-lg border border-[#e5e2e1] shadow-sm">
                Showing {results.length} flights
              </div>
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#e5e2e1] shadow-sm">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-[#5e3f3c] font-medium">Searching for the best flights...</p>
              </div>
            )}

            {!loading && error && (
              <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}
            
            {!loading && results.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#e5e2e1] shadow-sm text-center px-4">
                <div className="w-16 h-16 bg-[#fcf9f8] rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-4xl text-[#5e3f3c]">flight_off</span>
                </div>
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">No flights found</h3>
                <p className="text-[#5e3f3c]">Try broadening your search dates or looking for nearby airports.</p>
              </div>
            )}
            
            {!loading && results.length > 0 && (
              <div className="space-y-4">
                {results.map((f: any) => (
                  <FlightCard key={f.id} flight={f} currency={params.currency} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading search...</div>}>
      <SearchContent />
    </Suspense>
  );
}
