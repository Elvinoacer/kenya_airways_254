"use client";

import React from "react";
import type { Flight } from "../../../types/flight";
import { formatCurrency, formatFlightTime } from "../../../lib/currency";
import Link from "next/link";

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

  const capacities =
    (flight as any).classCapacity ||
    [
      { code: "CLASS_A", label: "Executive", available: flight.seatsAvailable?.FIRST || 0 },
      { code: "CLASS_B", label: "Middle Class", available: flight.seatsAvailable?.BUSINESS || 0 },
      { code: "CLASS_C", label: "Low Class", available: flight.seatsAvailable?.ECONOMY || 0 },
    ];

  const totalSeats = capacities.reduce(
    (sum: number, item: any) => sum + Number(item.available || 0),
    0
  );

  const durationHours = Math.floor(flight.durationMinutes / 60);
  const durationMins = flight.durationMinutes % 60;
  const stopsText =
    flight.stops === 0
      ? "Direct Flight"
      : `${flight.stops} Stop${flight.stops > 1 ? "s" : ""}`;

  return (
    <article className="bg-white border border-[#e5e2e1] rounded-3xl p-5 md:p-7 mb-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:border-[#d1cecd] transition-all duration-300 flex flex-col gap-6 relative group">
      
      {/* 1. Header: Airline & Metadata */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5e2e1]/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-[#fcf9f8] rounded-full flex items-center justify-center border border-[#e5e2e1]">
            <span className="material-symbols-outlined text-[#e71520]" aria-hidden="true">
              airlines
            </span>
          </div>
          <div>
            <h3 className="font-extrabold text-[#1A1A1A] text-base leading-tight">
              {flight.airline}
            </h3>
            <p className="text-xs font-semibold text-[#5e3f3c] mt-0.5">
              Flight {flight.flightNumber}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#5e3f3c]">
          <span className="bg-[#fcf9f8] px-3 py-1.5 rounded-lg border border-[#e5e2e1] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">settings_passenger_cu</span>
            {flight.aircraft}
          </span>
          <span className="bg-[#fcf9f8] px-3 py-1.5 rounded-lg border border-[#e5e2e1]">
            Terminal {flight.terminal}
          </span>
          <span
            className={`px-3 py-1.5 rounded-lg border font-bold ${
              totalSeats < 10
                ? "bg-[#fff5f5] text-[#e71520] border-[#ffdce0]"
                : "bg-[#fcf9f8] text-[#1A1A1A] border-[#e5e2e1]"
            }`}
          >
            {totalSeats} seats left
          </span>
        </div>
      </header>

      {/* 2. Main Body: Timeline & Action */}
      <div className="flex flex-col xl:flex-row gap-8 justify-between items-center">
        
        {/* Visual Flight Timeline */}
        <div className="flex-1 w-full flex items-center justify-between relative px-2 sm:px-4">
          
          {/* Departure */}
          <div className="text-center sm:text-left min-w-[80px]">
            <time className="block text-3xl sm:text-4xl font-black text-[#1A1A1A] tracking-tight">
              {formatFlightTime(flight.departAt)}
            </time>
            <span className="block text-lg font-bold text-[#e71520] mt-1">
              {flight.origin}
            </span>
            <span className="block text-xs font-semibold text-[#5e3f3c] uppercase tracking-wider mt-1">
              Depart
            </span>
          </div>

          {/* Central Path */}
          <div className="flex-1 flex flex-col items-center justify-center px-2 sm:px-8 relative">
            <div className="text-xs font-bold text-[#1A1A1A] mb-2 bg-[#fcf9f8] px-3 py-1 rounded-full border border-[#e5e2e1] whitespace-nowrap shadow-sm">
              {durationHours}h {durationMins}m
            </div>
            
            <div className="w-full flex items-center group-hover:opacity-100 transition-opacity">
              <div className="h-[2px] flex-1 bg-[#e5e2e1] relative overflow-hidden">
                 <div className="absolute inset-0 bg-[#e71520]/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-700 ease-in-out"></div>
              </div>
              <span className="material-symbols-outlined text-[#e71520] mx-2 text-[28px]" aria-hidden="true">
                flight
              </span>
              <div className="h-[2px] flex-1 bg-[#e5e2e1]"></div>
            </div>
            
            <div className="text-xs font-semibold text-[#5e3f3c] mt-2 whitespace-nowrap bg-white px-2">
              {stopsText}
            </div>
          </div>

          {/* Arrival */}
          <div className="text-center sm:text-right min-w-[80px]">
            <time className="block text-3xl sm:text-4xl font-black text-[#1A1A1A] tracking-tight">
              {formatFlightTime(flight.arriveAt)}
            </time>
            <span className="block text-lg font-bold text-[#1A1A1A] mt-1">
              {flight.destination}
            </span>
            <span className="block text-xs font-semibold text-[#5e3f3c] uppercase tracking-wider mt-1">
              Arrive
            </span>
          </div>
        </div>

        {/* Pricing & CTA Column */}
        <div className="w-full xl:w-auto flex flex-row xl:flex-col items-center xl:items-end justify-between xl:justify-center gap-4 xl:pl-8 xl:border-l border-[#e5e2e1]">
          <div className="text-left xl:text-right">
            <span className="block text-xs font-semibold text-[#5e3f3c] mb-1 uppercase tracking-wider">
              Starting from
            </span>
            <div className="text-3xl font-black text-[#1A1A1A]">
              {formatCurrency(price, currency === "KES" ? "KES" : "USD")}
            </div>
          </div>
          
          <Link
            href={`/bookings?flightId=${encodeURIComponent(flight.id)}`}
            aria-label={`Select flight from ${flight.origin} to ${flight.destination} for ${formatCurrency(price, currency === "KES" ? "KES" : "USD")}`}
            className="bg-[#e71520] text-white font-bold py-3.5 px-8 rounded-xl hover:bg-[#c9121a] shadow-[0_8px_20px_rgb(231,21,32,0.25)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-[#e71520]/30 flex items-center justify-center gap-2 whitespace-nowrap min-w-[140px]"
          >
            Select
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </div>
      </div>

      {/* 3. Footer: Class Availability Badges */}
      <footer className="pt-5 border-t border-[#e5e2e1]/60">
        <p className="text-[11px] font-bold text-[#5e3f3c] mb-3 uppercase tracking-wider">
          Class Availability
        </p>
        <div className="flex flex-wrap gap-3">
          {capacities.map((entry: any) => {
            const isAvailable = Number(entry.available) > 0;
            return (
              <div
                key={entry.code}
                className={`flex items-center gap-3 rounded-xl border px-3.5 py-2 text-sm transition-colors ${
                  isAvailable
                    ? "border-[#e5e2e1] bg-[#fcf9f8] hover:border-[#1A1A1A]/20"
                    : "border-[#ffdce0] bg-[#fff5f5] opacity-60"
                }`}
              >
                <span className="font-semibold text-[#1A1A1A]">{entry.label}</span>
                <div className="w-px h-4 bg-[#e5e2e1]"></div>
                <span
                  className={`font-black ${
                    isAvailable ? "text-emerald-700" : "text-[#e71520]"
                  }`}
                >
                  {isAvailable ? `${entry.available} seats` : "Sold out"}
                </span>
              </div>
            );
          })}
        </div>
      </footer>
    </article>
  );
}