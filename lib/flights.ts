import type { Flight, SeatClass } from "../types/flight";
import { DateTime } from "luxon";
import { v4 as uuidv4 } from "uuid";
import { AIRPORTS } from "./airports";

// Minimal mock dataset generator for flights.
function minutesBetween(a: any, b: any) {
  return Math.round(b.diff(a, "minutes").minutes);
}

function seededRandom(seed: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++)
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += h << 13;
    h ^= h >>> 7;
    h += h << 3;
    h ^= h >>> 17;
    h += h << 5;
    return (h >>> 0) / 4294967295;
  };
}

export function generateMockFlights(): Flight[] {
  const carriers = ["KA", "KQ", "SA", "EK"];
  const aircrafts = ["B737", "A320", "B787", "A330"];
  const flights: Flight[] = [];

  for (let i = 0; i < AIRPORTS.length; i++) {
    for (let j = 0; j < AIRPORTS.length; j++) {
      if (i === j) continue;
      const origin = AIRPORTS[i];
      const dest = AIRPORTS[j];
      const depart = DateTime.utc().plus({
        days: Math.floor(Math.random() * 30),
        hours: Math.floor(Math.random() * 24),
      });
      const baseDur = Math.max(
        40,
        Math.round(
          Math.abs(origin.lat - dest.lat) * 30 +
            Math.abs(origin.lon - dest.lon) * 20,
        ),
      );
      const arrive = depart.plus({
        minutes: baseDur + Math.floor(Math.random() * 120),
      });
      const idSeed = `${origin.iata}-${dest.iata}-${depart.toISO()}`;
      const rand = seededRandom(idSeed)();
      const flight: Flight = {
        id: uuidv4(),
        airline: carriers[Math.floor(rand * carriers.length)],
        flightNumber: `${carriers[Math.floor(rand * carriers.length)]}${100 + Math.floor(rand * 900)}`,
        origin: origin.iata,
        destination: dest.iata,
        departAt: depart.toISO(),
        arriveAt: arrive.toISO(),
        durationMinutes: minutesBetween(depart, arrive),
        stops: 0,
        aircraft: aircrafts[Math.floor(rand * aircrafts.length)],
        terminal: String(1 + Math.floor(rand * 4)),
        basePrice:
          Math.round(
            (50 +
              Math.abs(origin.lat - dest.lat) * 30 +
              Math.abs(origin.lon - dest.lon) * 20) *
              (1 + rand) *
              100,
          ) / 100,
        seatsAvailable: {
          ECONOMY: 50 - Math.floor(rand * 25),
          PREMIUM_ECONOMY: 12 - Math.floor(rand * 6),
          BUSINESS: 8 - Math.floor(rand * 4),
          FIRST: 4 - Math.floor(rand * 2),
        } as Record<SeatClass, number>,
        // Advanced flags (deterministic via seeded rand)
        refundable: rand > 0.3,
        baggageIncluded: rand > 0.2,
        mealIncluded: rand > 0.4,
        wifiAvailable: rand > 0.7,
        status: rand > 0.95 ? "DELAYED" : "ON_TIME",
      } as Flight;
      flights.push(flight);
    }
  }

  return flights;
}

const MOCK_FLIGHTS = generateMockFlights();

export type FlightSearchParams = {
  origin?: string;
  destination?: string;
  departDate?: string;
  returnDate?: string;
  tripType?: "ONEWAY" | "ROUNDTRIP" | "MULTI";
  passengers?: number;
  cabin?: SeatClass;
  sort?: "price" | "duration" | "depart";
  currency?: "USD" | "KES";
  page?: number;
  perPage?: number;
  flexible?: boolean;
  // Advanced filters
  priceMin?: number;
  priceMax?: number;
  durationMin?: number;
  durationMax?: number;
  departAfter?: string; // ISO time or HH:mm
  departBefore?: string;
  arriveAfter?: string;
  arriveBefore?: string;
  directOnly?: boolean;
  maxStops?: number;
  aircraft?: string;
  seatsMin?: number;
  refundable?: boolean;
  baggageIncluded?: boolean;
  mealIncluded?: boolean;
  wifiAvailable?: boolean;
};

export function searchFlights(params: FlightSearchParams) {
  let results = MOCK_FLIGHTS.slice();

  const originU = params.origin ? params.origin.toUpperCase() : undefined;
  const destU = params.destination
    ? params.destination.toUpperCase()
    : undefined;

  if (originU) results = results.filter((f) => f.origin === originU);
  if (destU) results = results.filter((f) => f.destination === destU);

  if (params.departDate) {
    const target = DateTime.fromISO(params.departDate);
    results = results.filter((f) =>
      DateTime.fromISO(f.departAt).hasSame(target, "day"),
    );
  }

  if (params.cabin) {
    const cabin =
      params.cabin as keyof (typeof MOCK_FLIGHTS)[number]["seatsAvailable"];
    results = results.filter((f) => (f.seatsAvailable as any)[cabin] > 0);
  }

  // price range
  if (typeof params.priceMin === "number")
    results = results.filter((f) => f.basePrice >= params.priceMin!);
  if (typeof params.priceMax === "number")
    results = results.filter((f) => f.basePrice <= params.priceMax!);

  // duration
  if (typeof params.durationMin === "number")
    results = results.filter((f) => f.durationMinutes >= params.durationMin!);
  if (typeof params.durationMax === "number")
    results = results.filter((f) => f.durationMinutes <= params.durationMax!);

  // departure / arrival time windows (compare local time-of-day)
  const parseTimeOfDay = (isoOrTime?: string) => {
    if (!isoOrTime) return null;
    // Accept HH:mm or ISO
    if (/^\d{2}:\d{2}$/.test(isoOrTime)) return isoOrTime;
    try {
      return DateTime.fromISO(isoOrTime).toFormat("HH:mm");
    } catch {
      return null;
    }
  };

  const departAfter = parseTimeOfDay(params.departAfter);
  const departBefore = parseTimeOfDay(params.departBefore);
  const arriveAfter = parseTimeOfDay(params.arriveAfter);
  const arriveBefore = parseTimeOfDay(params.arriveBefore);

  const timeInDay = (iso: string) => DateTime.fromISO(iso).toFormat("HH:mm");

  if (departAfter)
    results = results.filter((f) => timeInDay(f.departAt) >= departAfter!);
  if (departBefore)
    results = results.filter((f) => timeInDay(f.departAt) <= departBefore!);
  if (arriveAfter)
    results = results.filter((f) => timeInDay(f.arriveAt) >= arriveAfter!);
  if (arriveBefore)
    results = results.filter((f) => timeInDay(f.arriveAt) <= arriveBefore!);

  // direct / stops
  if (params.directOnly) results = results.filter((f) => f.stops === 0);
  if (typeof params.maxStops === "number")
    results = results.filter((f) => f.stops <= params.maxStops!);

  // aircraft type
  if (params.aircraft)
    results = results.filter((f) =>
      f.aircraft.toLowerCase().includes(params.aircraft!.toLowerCase()),
    );

  // seats available minimum across ECONOMY as baseline
  if (typeof params.seatsMin === "number")
    results = results.filter((f) =>
      Object.values(f.seatsAvailable).some((n) => n >= params.seatsMin!),
    );

  // feature flags
  if (typeof params.refundable === "boolean")
    results = results.filter(
      (f) => Boolean(f.refundable) === params.refundable,
    );
  if (typeof params.baggageIncluded === "boolean")
    results = results.filter(
      (f) => Boolean(f.baggageIncluded) === params.baggageIncluded,
    );
  if (typeof params.mealIncluded === "boolean")
    results = results.filter(
      (f) => Boolean(f.mealIncluded) === params.mealIncluded,
    );
  if (typeof params.wifiAvailable === "boolean")
    results = results.filter(
      (f) => Boolean(f.wifiAvailable) === params.wifiAvailable,
    );

  // sorting
  if (params.sort === "price")
    results.sort((a, b) => a.basePrice - b.basePrice);
  else if (params.sort === "duration")
    results.sort((a, b) => a.durationMinutes - b.durationMinutes);
  else
    results.sort(
      (a, b) =>
        DateTime.fromISO(a.departAt).toMillis() -
        DateTime.fromISO(b.departAt).toMillis(),
    );

  // pagination
  const page = Math.max(1, params.page || 1);
  const perPage = Math.min(100, params.perPage || 25);
  const total = results.length;
  const paged = results.slice((page - 1) * perPage, page * perPage);

  return { total, page, perPage, results: paged };
}

export function getFlightById(id: string) {
  return MOCK_FLIGHTS.find((f) => f.id === id) || null;
}
