"use client";

import React from "react";
import type { Flight } from "../../../types/flight";
import { formatCurrency } from "../../../lib/currency";
import Link from "next/link";
import { getAirportByCode } from "../../../lib/route-config";

type ClassCapacity = {
  code: string;
  label: string;
  available: number;
};

type FlightWithSearchMeta = Flight & {
  priceKES?: number;
  classCapacity?: ClassCapacity[];
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function FlightCard({
  flight,
  currency = "USD",
}: {
  flight: Flight;
  currency?: "USD" | "KES";
}) {
  const enrichedFlight = flight as FlightWithSearchMeta;
  const price =
    currency === "KES" && enrichedFlight.priceKES
      ? enrichedFlight.priceKES
      : flight.basePrice;

  const capacities =
    enrichedFlight.classCapacity ||
    [
      { code: "CLASS_A", label: "Executive", available: flight.seatsAvailable?.FIRST || 0 },
      { code: "CLASS_B", label: "Middle Class", available: flight.seatsAvailable?.BUSINESS || 0 },
      { code: "CLASS_C", label: "Economy", available: flight.seatsAvailable?.ECONOMY || 0 },
    ];

  const totalSeats = capacities.reduce(
    (sum, item) => sum + Number(item.available || 0),
    0
  );

  const durationHours = Math.floor(flight.durationMinutes / 60);
  const durationMins = flight.durationMinutes % 60;
  const stopsText =
    flight.stops === 0
      ? "Direct Flight"
      : `${flight.stops} Stop${flight.stops > 1 ? "s" : ""}`;
      
  const originAirport = getAirportByCode(flight.origin);
  const destinationAirport = getAirportByCode(flight.destination);
  const originCity = flight.originCity || originAirport?.city || flight.origin;
  const destinationCity =
    flight.destinationCity || destinationAirport?.city || flight.destination;
    
  const routeTitle = flight.routeTitle || `${originCity} to ${destinationCity}`;
  const routeImage = flight.routeImage || "/images/hero_banner.png";

  return (
    <article className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md">
      
      {/* Top Header: Airline & Basic Info */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 px-5 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e71520]/10">
            <span className="material-symbols-outlined text-[18px] text-[#e71520]" aria-hidden="true">
              airlines
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              {flight.airline} <span className="font-medium text-gray-500">{flight.flightNumber}</span>
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-600">
          <span className="rounded-md bg-white px-2.5 py-1 shadow-sm border border-gray-100">
            {flight.aircraft}
          </span>
          <span className="rounded-md bg-white px-2.5 py-1 shadow-sm border border-gray-100">
            Terminal {flight.terminal}
          </span>
          {totalSeats < 10 && (
            <span className="rounded-md bg-red-50 text-red-600 px-2.5 py-1 font-semibold border border-red-100">
              Only {totalSeats} left
            </span>
          )}
        </div>
      </header>

      {/* Main Body */}
      <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center">
        
        {/* Re-introduced Image: Now a sleek, controlled thumbnail */}
        <div className="group relative h-48 w-full shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-36 lg:h-32 lg:w-48 shadow-sm">
          <img
            src={routeImage}
            alt={routeTitle}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/80 drop-shadow-md">
              Destination
            </p>
            <h4 className="truncate text-sm font-bold text-white drop-shadow-md">
              {destinationCity}
            </h4>
          </div>
        </div>

        {/* Flight Route Details */}
        <div className="flex flex-1 items-center justify-between">
          
          {/* Origin */}
          <div className="w-[80px] sm:w-[120px]">
            <time className="block text-2xl sm:text-3xl font-black text-gray-900">
              {formatTime(flight.departAt)}
            </time>
            <p className="mt-1 text-xs sm:text-sm font-medium text-gray-500">
              {formatDate(flight.departAt)}
            </p>
            <div className="mt-3">
              <p className="text-lg sm:text-xl font-bold text-gray-900">{flight.origin}</p>
              <p className="truncate text-xs sm:text-sm text-gray-500">{originCity}</p>
            </div>
          </div>

          {/* Timeline & Duration */}
          <div className="flex flex-1 flex-col items-center px-2 sm:px-6">
            <span className="mb-2 whitespace-nowrap text-xs font-semibold text-gray-500">
              {durationHours}h {durationMins}m
            </span>
            <div className="flex w-full items-center">
              <div className="h-[2px] flex-1 rounded-full bg-gray-200" />
              <span className="material-symbols-outlined mx-2 text-[20px] text-[#e71520] rotate-90" aria-hidden="true">
                flight
              </span>
              <div className="h-[2px] flex-1 rounded-full bg-gray-200" />
            </div>
            <span className={`mt-2 whitespace-nowrap rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider ${flight.stops === 0 ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>
              {stopsText}
            </span>
          </div>

          {/* Destination */}
          <div className="w-[80px] text-right sm:w-[120px]">
            <time className="block text-2xl sm:text-3xl font-black text-gray-900">
              {formatTime(flight.arriveAt)}
            </time>
            <p className="mt-1 text-xs sm:text-sm font-medium text-gray-500">
              {formatDate(flight.arriveAt)}
            </p>
            <div className="mt-3">
              <p className="text-lg sm:text-xl font-bold text-gray-900">{flight.destination}</p>
              <p className="truncate text-xs sm:text-sm text-gray-500">{destinationCity}</p>
            </div>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-5 lg:min-w-[180px] lg:flex-col lg:items-end lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="text-left lg:text-right">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Price from</span>
            <div className="mt-1 text-2xl sm:text-3xl font-black text-[#e71520]">
              {formatCurrency(price, currency === "KES" ? "KES" : "USD")}
            </div>
          </div>
          
          <Link
            href={`/bookings?flightId=${encodeURIComponent(flight.id)}`}
            className="inline-flex min-w-[120px] items-center justify-center gap-2 rounded-xl bg-[#e71520] px-5 py-3 text-sm font-bold text-white transition-all hover:bg-[#c9121a] focus:outline-none focus:ring-4 focus:ring-[#e71520]/20 lg:mt-4 lg:w-full"
          >
            Select
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </div>
      </div>

      {/* Footer: Class Capacities */}
      <footer className="border-t border-gray-100 bg-gray-50/50 px-5 py-3 sm:px-6">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {capacities.map((entry) => {
            const isAvailable = Number(entry.available) > 0;
            return (
              <div key={entry.code} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-600">{entry.label}:</span>
                <span className={`font-semibold ${isAvailable ? "text-emerald-700" : "text-gray-400"}`}>
                  {isAvailable ? `${entry.available} left` : "Sold out"}
                </span>
              </div>
            );
          })}
        </div>
      </footer>
    </article>
  );
}