"use client";
import React from "react";
import type { Flight } from "../../../types/flight";
import { formatCurrency, formatFlightTime } from "../../../lib/currency";

export default function FlightCard({
  flight,
  currency = "USD",
}: {
  flight: Flight;
  currency?: "USD" | "KES";
}) {
  const price =
    currency === "KES" && (flight as any).priceKES
      ? (flight as any).priceKES
      : flight.basePrice;
  return (
    <div className="bg-white border border-[#e5e2e1] rounded-2xl p-6 mb-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-[#e5e2e1] pb-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#fcf9f8] rounded-xl flex items-center justify-center border border-[#e5e2e1]">
            <span className="material-symbols-outlined text-primary text-2xl">flight_takeoff</span>
          </div>
          <div>
            <div className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
              {flight.origin} <span className="material-symbols-outlined text-[#5e3f3c] text-sm">arrow_forward</span> {flight.destination}
            </div>
            <div className="text-[#5e3f3c] font-medium mt-0.5">
              {flight.airline} {flight.flightNumber}
            </div>
          </div>
        </div>
        <div className="text-left md:text-right">
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(price, currency === "KES" ? "KES" : "USD")}
          </div>
          <div className="text-sm font-semibold text-[#5e3f3c] bg-[#fcf9f8] inline-block px-2 py-0.5 rounded-full mt-1 border border-[#e5e2e1]">
            {flight.seatsAvailable.ECONOMY} seats left
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="block text-[#5e3f3c] mb-1">Departure</span>
          <span className="font-semibold text-[#1A1A1A] text-lg">{formatFlightTime(flight.departAt)}</span>
        </div>
        <div>
          <span className="block text-[#5e3f3c] mb-1">Arrival</span>
          <span className="font-semibold text-[#1A1A1A] text-lg">{formatFlightTime(flight.arriveAt)}</span>
        </div>
        <div>
          <span className="block text-[#5e3f3c] mb-1">Duration & Stops</span>
          <span className="font-medium text-[#1A1A1A]">
            {Math.round(flight.durationMinutes / 60)}h{" "}
            {flight.durationMinutes % 60}m
          </span>
          <span className="text-[#5e3f3c] ml-2">({flight.stops === 0 ? 'Direct' : `${flight.stops} Stop${flight.stops > 1 ? 's' : ''}`})</span>
        </div>
        <div>
          <span className="block text-[#5e3f3c] mb-1">Aircraft info</span>
          <span className="font-medium text-[#1A1A1A]">{flight.aircraft}</span>
          <span className="text-[#5e3f3c] ml-2">T-{flight.terminal}</span>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-[#e5e2e1] flex justify-end">
        <button className="bg-primary text-white font-semibold py-2 px-6 rounded-lg hover:bg-[#e71520] transition-colors flex items-center gap-2">
          Select Flight
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
