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
      { code: "CLASS_C", label: "Low Class", available: flight.seatsAvailable?.ECONOMY || 0 },
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
    <article className="overflow-hidden rounded-2xl border border-[#e5e2e1] bg-white shadow-[0_10px_30px_rgba(13,13,13,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#d8d0ce] hover:shadow-[0_18px_44px_rgba(13,13,13,0.1)]">
      <div className="grid lg:grid-cols-[220px_1fr]">
        <div className="relative min-h-[170px] lg:min-h-full bg-[#410001]">
          <img
            src={routeImage}
            alt={routeTitle}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute left-4 right-4 bottom-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">
              {flight.airline} {flight.flightNumber}
            </p>
            <h3 className="mt-1 text-xl font-black leading-tight text-white">
              {routeTitle}
            </h3>
          </div>
        </div>

        <div className="p-5 md:p-6">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eee8e6] pb-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#5e3f3c]">
              <span className="rounded-full border border-[#e5e2e1] bg-[#fcf9f8] px-3 py-1.5">
                {flight.aircraft}
              </span>
              <span className="rounded-full border border-[#e5e2e1] bg-[#fcf9f8] px-3 py-1.5">
                Terminal {flight.terminal}
              </span>
              <span
                className={`rounded-full border px-3 py-1.5 ${
                  totalSeats < 10
                    ? "border-[#ffdce0] bg-[#fff5f5] text-[#e71520]"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {totalSeats} seats left
              </span>
            </div>
            <span className="rounded-full bg-[#410001] px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-white">
              {stopsText}
            </span>
          </header>

          <div className="grid gap-6 py-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
              <div>
                <time className="block text-4xl font-black leading-none text-[#1A1A1A]">
                  {formatTime(flight.departAt)}
                </time>
                <p className="mt-2 text-sm font-bold text-[#5e3f3c]">
                  {formatDate(flight.departAt)}
                </p>
                <p className="mt-3 text-2xl font-black text-[#e71520]">
                  {flight.origin}
                </p>
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  {originCity}
                </p>
              </div>

              <div className="flex min-w-[96px] flex-col items-center sm:min-w-[150px]">
                <div className="rounded-full border border-[#e5e2e1] bg-[#fcf9f8] px-3 py-1 text-xs font-black text-[#1A1A1A] shadow-sm">
                  {durationHours}h {durationMins}m
                </div>
                <div className="my-3 flex w-full items-center">
                  <div className="h-px flex-1 bg-[#d9d1cf]" />
                  <span className="material-symbols-outlined mx-2 text-[24px] text-[#e71520]" aria-hidden="true">
                    flight
                  </span>
                  <div className="h-px flex-1 bg-[#d9d1cf]" />
                </div>
                <p className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-[#5e3f3c]">
                  {stopsText}
                </p>
              </div>

              <div className="text-right">
                <time className="block text-4xl font-black leading-none text-[#1A1A1A]">
                  {formatTime(flight.arriveAt)}
                </time>
                <p className="mt-2 text-sm font-bold text-[#5e3f3c]">
                  {formatDate(flight.arriveAt)}
                </p>
                <p className="mt-3 text-2xl font-black text-[#1A1A1A]">
                  {flight.destination}
                </p>
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  {destinationCity}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-[#eee8e6] pt-5 lg:block lg:min-w-[170px] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 lg:text-right">
              <div>
                <span className="block text-[11px] font-black uppercase tracking-[0.16em] text-[#5e3f3c]">
                  From
                </span>
                <div className="mt-1 text-3xl font-black text-[#1A1A1A]">
                  {formatCurrency(price, currency === "KES" ? "KES" : "USD")}
                </div>
              </div>
              <Link
                href={`/bookings?flightId=${encodeURIComponent(flight.id)}`}
                aria-label={`Select flight from ${flight.origin} to ${flight.destination} for ${formatCurrency(price, currency === "KES" ? "KES" : "USD")}`}
                className="inline-flex min-w-[132px] items-center justify-center gap-2 rounded-xl bg-[#e71520] px-6 py-3.5 font-bold text-white shadow-[0_10px_24px_rgba(231,21,32,0.22)] transition-all duration-200 hover:bg-[#c9121a] focus:outline-none focus:ring-4 focus:ring-[#e71520]/30"
              >
                Select
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>

          <footer className="border-t border-[#eee8e6] pt-4">
            <div className="flex flex-wrap gap-2">
              {capacities.map((entry) => {
                const isAvailable = Number(entry.available) > 0;
                return (
                  <div
                    key={entry.code}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                      isAvailable
                        ? "border-[#e5e2e1] bg-[#fcf9f8]"
                        : "border-[#ffdce0] bg-[#fff5f5] opacity-70"
                    }`}
                  >
                    <span className="font-bold text-[#1A1A1A]">{entry.label}</span>
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
        </div>
      </div>
    </article>
  );
}
