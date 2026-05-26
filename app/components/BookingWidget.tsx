"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AIRPORTS } from "@/lib/airports";

export default function BookingWidget() {
  const [tripType, setTripType] = useState("return");
  const [origin, setOrigin] = useState("NBO");
  const [destination, setDestination] = useState("");
  const [departDate, setDepartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [cabin, setCabin] = useState("CLASS_C");
  const router = useRouter();

  function handleSearch() {
    const query = new URLSearchParams();

    query.set("origin", origin);
    query.set("destination", destination);
    if (departDate) query.set("departDate", departDate);
    if (tripType === "return" && returnDate)
      query.set("returnDate", returnDate);
    query.set("tripType", tripType);
    query.set("passengers", String(passengers));
    query.set("cabin", cabin);

    router.push(`/search?${query.toString()}`);
  }

  return (
    <form
      className="bg-white rounded-xl p-6 shadow-sm border border-[#e5e2e1]"
      onSubmit={(event) => {
        event.preventDefault();
        handleSearch();
      }}
    >
      {/* Trip Type Toggle */}
      <div className="flex items-center gap-4 mb-6 border-b border-[#e5e2e1] pb-4">
        {[
          { value: "return", label: "Return" },
          { value: "oneway", label: "One-way" },
        ].map(({ value, label }) => (
          <label
            key={value}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <input
              type="radio"
              name="tripType"
              checked={tripType === value}
              onChange={() => setTripType(value)}
              className="text-primary focus:ring-primary h-5 w-5 border-[#936e6a]"
            />
            <span className="text-sm font-medium text-[#1A1A1A] group-hover:text-primary transition-colors">
              {label}
            </span>
          </label>
        ))}
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative group">
          <label className="block text-xs font-semibold tracking-wide text-[#5e3f3c] mb-1">
            From
          </label>
          <div className="flex items-center border border-[#936e6a] rounded-lg p-3 group-focus-within:border-primary transition-colors">
            <span className="material-symbols-outlined text-[#936e6a] mr-2 text-xl">
              flight_takeoff
            </span>
            <select
              value={origin}
              onChange={(event) => setOrigin(event.target.value)}
              className="w-full border-none focus:ring-0 p-0 text-sm text-[#1A1A1A] bg-transparent"
            >
              {AIRPORTS.map((airport) => (
                <option key={airport.iata} value={airport.iata}>
                  {airport.city} ({airport.iata})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="relative group">
          <label className="block text-xs font-semibold tracking-wide text-[#5e3f3c] mb-1">
            To
          </label>
          <div className="flex items-center border border-[#936e6a] rounded-lg p-3 group-focus-within:border-primary transition-colors">
            <span className="material-symbols-outlined text-[#936e6a] mr-2 text-xl">
              flight_land
            </span>
            <select
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              className="w-full border-none focus:ring-0 p-0 text-sm text-[#1A1A1A] bg-transparent"
              required
            >
              <option value="">Destination</option>
              {AIRPORTS.filter((airport) => airport.iata !== origin).map((airport) => (
                <option key={airport.iata} value={airport.iata}>
                  {airport.city} ({airport.iata})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="relative group">
          <label className="block text-xs font-semibold tracking-wide text-[#5e3f3c] mb-1">
            Depart
          </label>
          <div className="flex items-center border border-[#936e6a] rounded-lg p-3 group-focus-within:border-primary transition-colors">
            <span className="material-symbols-outlined text-[#936e6a] mr-2 text-xl">
              calendar_month
            </span>
            <input
              type="date"
              value={departDate}
              onChange={(event) => setDepartDate(event.target.value)}
              className="w-full border-none focus:ring-0 p-0 text-sm text-[#1A1A1A] bg-transparent"
            />
          </div>
        </div>
        {tripType === "return" && (
          <div className="relative group">
            <label className="block text-xs font-semibold tracking-wide text-[#5e3f3c] mb-1">
              Return
            </label>
            <div className="flex items-center border border-[#936e6a] rounded-lg p-3 group-focus-within:border-primary transition-colors">
              <span className="material-symbols-outlined text-[#936e6a] mr-2 text-xl">
                calendar_month
              </span>
              <input
                type="date"
                value={returnDate}
                onChange={(event) => setReturnDate(event.target.value)}
                className="w-full border-none focus:ring-0 p-0 text-sm text-[#1A1A1A] bg-transparent"
              />
            </div>
          </div>
        )}

        {/* Passengers */}
        <div className="relative group">
          <label className="block text-xs font-semibold tracking-wide text-[#5e3f3c] mb-1">
            Passengers
          </label>
          <div className="flex items-center border border-[#936e6a] rounded-lg p-3 group-focus-within:border-primary transition-colors">
            <span className="material-symbols-outlined text-[#936e6a] mr-2 text-xl">
              person
            </span>
            <input
              type="number"
              min="1"
              max="9"
              value={passengers}
              onChange={(event) => setPassengers(Number(event.target.value))}
              className="w-full border-none focus:ring-0 p-0 text-sm text-[#1A1A1A] cursor-pointer bg-transparent"
            />
          </div>
        </div>
        <div className="relative group">
          <label className="block text-xs font-semibold tracking-wide text-[#5e3f3c] mb-1">
            Cabin
          </label>
          <div className="flex items-center border border-[#936e6a] rounded-lg p-3 group-focus-within:border-primary transition-colors">
            <span className="material-symbols-outlined text-[#936e6a] mr-2 text-xl">
              airline_seat_recline_extra
            </span>
            <select
              value={cabin}
              onChange={(event) => setCabin(event.target.value)}
              className="w-full border-none focus:ring-0 p-0 text-sm text-[#1A1A1A] bg-transparent"
            >
              <option value="CLASS_C">Class C: Low class</option>
              <option value="CLASS_B">Class B: Middle class</option>
              <option value="CLASS_A">Class A: Executive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Search Button */}
      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          className="bg-primary text-white text-sm font-medium tracking-wide px-8 py-3 rounded-lg hover:bg-[#e71520] transition-colors shadow-[0_12px_32px_rgba(13,13,13,0.08)] flex items-center gap-2"
        >
          Search Flights
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            arrow_forward
          </span>
        </button>
      </div>
    </form>
  );
}
