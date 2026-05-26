"use client";

import React, { Suspense, useEffect, useState } from "react";
import FlightCard from "./components/FlightCard";
import { useRouter, useSearchParams } from "next/navigation";
import { AIRPORTS } from "@/lib/airports";
import { getDestinationImage, getRouteConfig } from "@/lib/route-config";

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

type SearchFlight = React.ComponentProps<typeof FlightCard>["flight"] & {
  priceKES?: number;
  classCapacity?: Array<{ code: string; label: string; available: number }>;
};

function SearchContent() {
  const [params, setParams] = useState<SearchParams>({ currency: "USD", tripType: "return", passengers: "1" });
  const [results, setResults] = useState<SearchFlight[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParamsHook = useSearchParams();

  // Helper to swap origin and destination
  const handleSwapRoute = () => {
    setParams((prev) => ({
      ...prev,
      origin: prev.destination,
      destination: prev.origin,
    }));
  };

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
      } catch {
        /* ignore in environments without router support */
      }

      try {
        const res = await fetch(`/api/flights?${qs.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Search failed");
        setResults(data.results || []);
      } catch (err: unknown) {
        setResults([]);
        setError(err instanceof Error ? err.message : "We couldn't load flights right now. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    doSearch();
  }, [params, initialized, router]);

  useEffect(() => {
    try {
      const sp = Object.fromEntries(searchParamsHook?.entries() || []);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setParams({ currency: "USD", passengers: "1", tripType: "return", ...sp } as SearchParams);
      setInitialized(true);
    } catch {
      setInitialized(true);
    }
  }, [searchParamsHook]);

  const heroRoute = getRouteConfig(params.origin, params.destination);
  const heroImage = heroRoute?.image || getDestinationImage(params.destination);

  return (
    <div className="min-h-screen bg-[#fcf9f8] font-sans selection:bg-[#e71520] selection:text-white">
      {/* Premium Hero Header */}
      <header className="bg-[#410001] relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Search flights background"
            className="w-full h-full object-cover opacity-20 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#410001] via-[#410001]/80 to-transparent"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 tracking-tight">
            Where to next?
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto font-medium">
            Find and book your perfect flight with Kenya Airways.
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-16 relative z-10 w-full overflow-hidden">
        {/* FIX: Improved Grid layout breakpoints so Sidebar doesn't crush the cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8">
          
          {/* Form Sidebar: Changed to span 4 on lg, and 3 on xl to give cards more room */}
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="bg-white p-5 md:p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#e5e2e1]">
              <h2 className="text-xl font-bold text-[#1A1A1A] mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#e71520]" aria-hidden="true">
                  travel_explore
                </span>
                Find Flights
              </h2>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget as HTMLFormElement);
                  const next: SearchParams = {
                    ...params, 
                    departDate: String(form.get("departDate") || ""),
                    returnDate: String(form.get("returnDate") || ""),
                    cabin: String(form.get("cabin") || ""),
                    passengers: String(form.get("passengers") || "1"),
                    currency: String(form.get("currency") || "USD") as "USD" | "KES",
                  };

                  const priceMin = form.get("priceMin");
                  const priceMax = form.get("priceMax");
                  const durationMax = form.get("durationMax");
                  const seatsMin = form.get("seatsMin");
                  const directOnly = form.get("directOnly");
                  const refundable = form.get("refundable");
                  const baggageIncluded = form.get("baggageIncluded");

                  if (priceMin) next.priceMin = String(priceMin);
                  if (priceMax) next.priceMax = String(priceMax);
                  if (durationMax) next.durationMax = String(durationMax);
                  if (seatsMin) next.seatsMin = String(seatsMin);

                  if (directOnly) next.directOnly = "true";
                  else delete next.directOnly;
                  if (refundable) next.refundable = "true";
                  else delete next.refundable;
                  if (baggageIncluded) next.baggageIncluded = "true";
                  else delete next.baggageIncluded;

                  setParams(next);
                }}
                className="space-y-6"
              >
                {/* 1. Trip Type Segmented Control */}
                <div className="bg-[#fcf9f8] p-1.5 rounded-xl flex items-center border border-[#e5e2e1]">
                  <button
                    type="button"
                    onClick={() => setParams((prev) => ({ ...prev, tripType: "return" }))}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      params.tripType === "return"
                        ? "bg-white text-[#1A1A1A] shadow-sm ring-1 ring-black/5"
                        : "text-[#5e3f3c] hover:text-[#1A1A1A]"
                    }`}
                  >
                    Return
                  </button>
                  <button
                    type="button"
                    onClick={() => setParams((prev) => ({ ...prev, tripType: "oneway", returnDate: "" }))}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      params.tripType === "oneway"
                        ? "bg-white text-[#1A1A1A] shadow-sm ring-1 ring-black/5"
                        : "text-[#5e3f3c] hover:text-[#1A1A1A]"
                    }`}
                  >
                    One-way
                  </button>
                </div>

                {/* 2. Route Settings */}
                <div className="space-y-4 relative">
                  <div>
                    <label htmlFor="origin" className="block text-sm font-medium text-[#5e3f3c] mb-1.5">
                      From
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5e3f3c]/60 pointer-events-none" aria-hidden="true">
                        flight_takeoff
                      </span>
                      <select
                        id="origin"
                        name="origin"
                        value={params.origin || ""}
                        onChange={(e) => setParams((current) => ({ ...current, origin: e.target.value }))}
                        className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-[#e5e2e1] bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#e71520] appearance-none"
                      >
                        <option value="">Any origin</option>
                        {AIRPORTS.map((airport) => (
                          <option key={airport.iata} value={airport.iata}>
                            {airport.city} ({airport.iata})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="absolute right-4 top-[45%] -translate-y-1/2 z-10 hidden sm:block lg:hidden xl:block">
                    <button
                      type="button"
                      onClick={handleSwapRoute}
                      aria-label="Swap origin and destination"
                      className="bg-white border border-[#e5e2e1] p-1.5 rounded-full shadow-sm text-[#5e3f3c] hover:text-[#e71520] hover:border-[#e71520] transition-colors focus:outline-none focus:ring-2 focus:ring-[#e71520]"
                    >
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">
                        swap_vert
                      </span>
                    </button>
                  </div>

                  <div>
                    <label htmlFor="destination" className="block text-sm font-medium text-[#5e3f3c] mb-1.5">
                      To
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5e3f3c]/60 pointer-events-none" aria-hidden="true">
                        flight_land
                      </span>
                      <select
                        id="destination"
                        name="destination"
                        value={params.destination || ""}
                        onChange={(e) => setParams((current) => ({ ...current, destination: e.target.value }))}
                        className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-[#e5e2e1] bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#e71520] appearance-none"
                      >
                        <option value="">Any destination</option>
                        {AIRPORTS.map((airport) => (
                          <option key={airport.iata} value={airport.iata}>
                            {airport.city} ({airport.iata})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="departDate" className="block text-sm font-medium text-[#5e3f3c] mb-1.5">Depart</label>
                    <div className="relative">
                      <input
                        id="departDate"
                        name="departDate"
                        defaultValue={params.departDate || ""}
                        type="date"
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#e5e2e1] bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#e71520]"
                      />
                    </div>
                  </div>
                  <div className={`${params.tripType === "oneway" ? "opacity-50 pointer-events-none" : ""}`}>
                    <label htmlFor="returnDate" className="block text-sm font-medium text-[#5e3f3c] mb-1.5">Return</label>
                    <div className="relative">
                      <input
                        id="returnDate"
                        name="returnDate"
                        defaultValue={params.returnDate || ""}
                        type="date"
                        disabled={params.tripType === "oneway"}
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#e5e2e1] bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#e71520]"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Passengers & Cabin */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="passengers" className="block text-sm font-medium text-[#5e3f3c] mb-1.5">Passengers</label>
                    <div className="relative">
                      <input
                        id="passengers"
                        name="passengers"
                        defaultValue={params.passengers || "1"}
                        min="1" max="9" type="number"
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#e5e2e1] bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#e71520]"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="cabin" className="block text-sm font-medium text-[#5e3f3c] mb-1.5">Cabin</label>
                    <div className="relative">
                      <select
                        id="cabin"
                        name="cabin"
                        defaultValue={params.cabin || ""}
                        className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#e5e2e1] bg-white text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#e71520] appearance-none"
                      >
                        <option value="">Any</option>
                        <option value="CLASS_A">Executive</option>
                        <option value="CLASS_B">Middle</option>
                        <option value="CLASS_C">Low</option>
                      </select>
                    </div>
                  </div>
                </div>

                <hr className="border-[#e5e2e1]" />

                {/* 5. Filters */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-[#1A1A1A] text-base">Filters</h3>
                    <select
                      aria-label="Currency"
                      name="currency"
                      defaultValue={params.currency || "USD"}
                      className="text-xs font-medium rounded-lg border border-[#e5e2e1] bg-[#fcf9f8] px-2.5 py-1 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#e71520]"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="KES">KES (KSh)</option>
                    </select>
                  </div>

                  <div className="space-y-3 mb-5">
                    {[
                      { id: "directOnly", label: "Direct flights only" },
                      { id: "refundable", label: "Fully Refundable" },
                      { id: "baggageIncluded", label: "Baggage Included" },
                    ].map((checkbox) => (
                      <label key={checkbox.id} htmlFor={checkbox.id} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          id={checkbox.id}
                          name={checkbox.id}
                          type="checkbox"
                          defaultChecked={params[checkbox.id as keyof SearchParams] === "true"}
                          className="w-4 h-4 text-[#e71520] bg-white border-[#e5e2e1] rounded focus:ring-[#e71520]"
                        />
                        <span className="text-sm font-medium text-[#5e3f3c] group-hover:text-[#1A1A1A]">{checkbox.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input name="priceMin" defaultValue={params.priceMin || ""} placeholder="Min $" type="number" className="w-full px-3 py-2 text-sm rounded-lg border border-[#e5e2e1]" />
                    <input name="priceMax" defaultValue={params.priceMax || ""} placeholder="Max $" type="number" className="w-full px-3 py-2 text-sm rounded-lg border border-[#e5e2e1]" />
                    <input name="durationMax" defaultValue={params.durationMax || ""} placeholder="Max mins" type="number" className="w-full px-3 py-2 text-sm rounded-lg border border-[#e5e2e1]" />
                    <input name="seatsMin" defaultValue={params.seatsMin || ""} placeholder="Min seats" type="number" className="w-full px-3 py-2 text-sm rounded-lg border border-[#e5e2e1]" />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 px-6 rounded-xl bg-[#e71520] text-white font-bold text-base hover:bg-[#c9121a] shadow-lg shadow-[#e71520]/25 transition-all flex justify-center items-center gap-2"
                  >
                    Search Flights
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_forward</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Results Area: Changed to span 8 on lg, and 9 on xl for massive breathing room */}
          <div className="lg:col-span-8 xl:col-span-9 min-w-0">
            
            {/* Header */}
            <div className="mb-6 bg-white p-4 rounded-2xl shadow-sm border border-[#e5e2e1] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#1A1A1A]">Available Flights</h2>
                <p className="text-sm text-[#5e3f3c] mt-0.5">
                  {!loading && (results.length > 0 ? `Showing ${results.length} results` : "No results yet")}
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="material-symbols-outlined text-[#5e3f3c] text-sm" aria-hidden="true">sort</span>
                <select
                  id="sortResults"
                  name="sort"
                  value={params.sort || "depart"}
                  onChange={(e) => setParams((current) => ({ ...current, sort: e.target.value }))}
                  className="w-full sm:w-auto text-sm font-medium rounded-xl border border-[#e5e2e1] bg-[#fcf9f8] px-4 py-2 text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#e71520] appearance-none"
                >
                  <option value="depart">Sort: Earliest Depart</option>
                  <option value="price">Sort: Lowest Price</option>
                  <option value="duration">Sort: Shortest Flight</option>
                </select>
              </div>
            </div>

            {loading && (
              <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-[#e5e2e1]">
                <div className="w-14 h-14 border-4 border-[#fcf9f8] border-t-[#e71520] rounded-full animate-spin mb-6" />
                <h3 className="text-xl font-bold text-[#1A1A1A]">Finding best routes...</h3>
              </div>
            )}

            {!loading && error && (
              <div className="mb-4 rounded-2xl border-l-4 border-[#e71520] bg-[#fff5f5] p-6 flex items-start gap-4">
                <span className="material-symbols-outlined text-[#e71520] text-2xl" aria-hidden="true">error</span>
                <div>
                  <h3 className="font-bold text-[#e71520] mb-1">We hit a snag</h3>
                  <p className="text-sm font-medium text-[#5e3f3c]">{error}</p>
                </div>
              </div>
            )}

            {!loading && !error && results.length === 0 && initialized && (
              <div className="flex flex-col items-center justify-center py-28 bg-white rounded-3xl border border-[#e5e2e1] text-center px-6">
                 <h3 className="text-2xl font-bold text-[#1A1A1A] mb-3">No flights found</h3>
                 <p className="text-[#5e3f3c] max-w-md mx-auto">Try adjusting your filters or route.</p>
                 <button onClick={() => setParams({ currency: "USD", tripType: "return", passengers: "1" })} className="mt-6 px-6 py-2.5 rounded-lg border-2 border-[#e5e2e1] font-semibold">
                   Clear filters
                 </button>
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="space-y-5">
                {results.map((f) => (
                  <FlightCard key={f.id} flight={f} currency={params.currency} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#fcf9f8]"><div className="w-12 h-12 border-4 border-gray-200 border-t-[#e71520] rounded-full animate-spin" /></div>}>
      <SearchContent />
    </Suspense>
  );
}