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
    <div className="p-4 border rounded-md mb-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium">
            {flight.airline} {flight.flightNumber}
          </div>
          <div className="text-sm text-muted-foreground">
            {flight.origin} → {flight.destination}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold">
            {formatCurrency(price, currency === "KES" ? "KES" : "USD")}
          </div>
          <div className="text-sm">{flight.seatsAvailable.ECONOMY} seats</div>
        </div>
      </div>
      <div className="mt-2 text-sm">
        <div>Depart: {formatFlightTime(flight.departAt)}</div>
        <div>Arrive: {formatFlightTime(flight.arriveAt)}</div>
        <div>
          Duration: {Math.round(flight.durationMinutes / 60)}h{" "}
          {flight.durationMinutes % 60}m • Stops: {flight.stops}
        </div>
        <div>
          Aircraft: {flight.aircraft} • Terminal: {flight.terminal}
        </div>
      </div>
    </div>
  );
}
