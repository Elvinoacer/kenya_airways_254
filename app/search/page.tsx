"use client";
import React, { Suspense, useEffect, useState } from "react";
import FlightCard from "./components/FlightCard";
import { useRouter, useSearchParams } from "next/navigation";

type SearchParams = {
  origin?: string;
  destination?: string;
  departDate?: string;
  returnDate?: string;
  tripType?: string;
  cabin?: string;
  sort?: string;
  currency?: "USD" | "KES";
};

function SearchContent() {
  const [params, setParams] = useState<SearchParams>({ currency: "USD" });
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParamsHook = useSearchParams();

  useEffect(() => {
    async function doSearch() {
      setLoading(true);
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
      const res = await fetch(`/api/flights?${qs.toString()}`);
      const data = await res.json();
      setResults(data.results || []);
      setLoading(false);
    }
    doSearch();
  }, [params]);

  useEffect(() => {
    // initialize from URL search params on mount
    try {
      const sp = Object.fromEntries(searchParamsHook?.entries() || []);
      if (Object.keys(sp).length) setParams(sp as any);
    } catch (e) {
      // ignore
    }
  }, [searchParamsHook]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Flight Search (skeleton)</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget as HTMLFormElement);
          const next: any = {
            origin: String(form.get("origin") || ""),
            destination: String(form.get("destination") || ""),
            departDate: String(form.get("departDate") || ""),
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
          if (mealIncluded) next.mealIncluded = "true";
          if (wifiAvailable) next.wifiAvailable = "true";

          setParams(next);
        }}
        className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6"
      >
        <input
          name="origin"
          placeholder="Origin (IATA or city)"
          className="p-2 border rounded"
        />
        <input
          name="destination"
          placeholder="Destination (IATA or city)"
          className="p-2 border rounded"
        />
        <input name="departDate" type="date" className="p-2 border rounded" />
        <select
          name="currency"
          defaultValue="USD"
          className="p-2 border rounded"
        >
          <option value="USD">USD</option>
          <option value="KES">KES</option>
        </select>
        {/* Advanced filters (skeleton inputs) */}
        <input
          name="priceMin"
          type="number"
          placeholder="Min price (USD)"
          className="p-2 border rounded"
        />
        <input
          name="priceMax"
          type="number"
          placeholder="Max price (USD)"
          className="p-2 border rounded"
        />
        <input
          name="durationMax"
          type="number"
          placeholder="Max duration (min)"
          className="p-2 border rounded"
        />
        <input
          name="departAfter"
          type="time"
          placeholder="Depart after"
          className="p-2 border rounded"
        />
        <input
          name="departBefore"
          type="time"
          placeholder="Depart before"
          className="p-2 border rounded"
        />
        <label className="flex items-center gap-2 p-2">
          <input name="directOnly" type="checkbox" /> Direct flights only
        </label>
        <input
          name="maxStops"
          type="number"
          placeholder="Max stops"
          className="p-2 border rounded"
        />
        <input
          name="aircraft"
          placeholder="Aircraft (e.g., B737)"
          className="p-2 border rounded"
        />
        <input
          name="seatsMin"
          type="number"
          placeholder="Seats min"
          className="p-2 border rounded"
        />
        <label className="flex items-center gap-2 p-2">
          <input name="refundable" type="checkbox" /> Refundable
        </label>
        <label className="flex items-center gap-2 p-2">
          <input name="baggageIncluded" type="checkbox" /> Baggage
        </label>
        <label className="flex items-center gap-2 p-2">
          <input name="mealIncluded" type="checkbox" /> Meal
        </label>
        <label className="flex items-center gap-2 p-2">
          <input name="wifiAvailable" type="checkbox" /> Wi‑Fi
        </label>
        <div className="md:col-span-4">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Search
          </button>
        </div>
      </form>

      <div>
        <div className="mb-3">Filters & Sorting: (skeleton)</div>
        {loading && <div>Loading results...</div>}
        {!loading && results.length === 0 && (
          <div>No flights found — try broadening dates or nearby airports.</div>
        )}
        {!loading &&
          results.map((f: any) => (
            <FlightCard key={f.id} flight={f} currency={params.currency} />
          ))}
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
