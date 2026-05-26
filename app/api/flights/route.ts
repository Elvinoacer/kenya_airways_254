import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getClassCapacitySummary } from "../../../lib/seats";
import { REQUIRED_TRAVEL_CLASSES } from "../../../lib/travel-classes";
import { AIRPORTS } from "../../../lib/airports";
import { convertUsdToKes } from "../../../lib/currency";

type FlightWithMetaAndRoute = Awaited<ReturnType<typeof prisma.flight.findMany>>[number];

function normalizeAirportQuery(value: string | null) {
  const raw = (value || "").trim();
  if (!raw) return null;
  const match =
    AIRPORTS.find(
      (airport) =>
        airport.iata.toLowerCase() === raw.toLowerCase() ||
        airport.city.toLowerCase() === raw.toLowerCase() ||
        `${airport.city} (${airport.iata})`.toLowerCase() === raw.toLowerCase(),
    ) || null;
  return {
    raw,
    iata: match?.iata,
    city: match?.city,
  };
}

function parseNumber(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBoolean(value: string | null) {
  if (!value) return undefined;
  return value === "true" || value === "1" || value === "on";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || undefined;
  const origin = normalizeAirportQuery(url.searchParams.get("origin"));
  const destination = normalizeAirportQuery(url.searchParams.get("destination"));
  const departDate = url.searchParams.get("departDate");
  const cabin = url.searchParams.get("cabin");
  const sort = url.searchParams.get("sort") || "depart";
  const currency = url.searchParams.get("currency") === "KES" ? "KES" : "USD";

  if (url.searchParams.get("export") === "csv") {
    const rows = await prisma.flight.findMany({
      orderBy: { departureTime: "asc" },
    });

    const headers = ["id", "flight_number", "origin", "destination", "departure_time", "arrival_time"];

    const csv = [headers.join(",")]
      .concat(
        rows.map((r: any) =>
          headers
            .map((h) => {
              const key =
                h === "flight_number"
                  ? "flightNumber"
                  : h === "departure_time"
                    ? "departureTime"
                    : h === "arrival_time"
                      ? "arrivalTime"
                      : h;
              return JSON.stringify(r[key] ?? "");
            })
            .join(","),
        ),
      )
      .join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: { "Content-Type": "text/csv" },
    });
  }

  const where: any = {
    AND: [],
  };
  if (q) {
    where.AND.push({
      OR: [
        { flightNumber: { contains: q, mode: "insensitive" } },
        { origin: { contains: q, mode: "insensitive" } },
        { destination: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (origin) {
    where.AND.push({
      OR: [
        { origin: { equals: origin.iata || origin.raw, mode: "insensitive" } },
        { origin: { contains: origin.city || origin.raw, mode: "insensitive" } },
        { origin: { contains: origin.raw, mode: "insensitive" } },
      ],
    });
  }

  if (destination) {
    where.AND.push({
      OR: [
        { destination: { equals: destination.iata || destination.raw, mode: "insensitive" } },
        { destination: { contains: destination.city || destination.raw, mode: "insensitive" } },
        { destination: { contains: destination.raw, mode: "insensitive" } },
      ],
    });
  }

  if (departDate) {
    const start = new Date(`${departDate}T00:00:00.000Z`);
    const end = new Date(`${departDate}T23:59:59.999Z`);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      where.AND.push({ departureTime: { gte: start, lte: end } });
    }
  }

  if (where.AND.length === 0) delete where.AND;

  const flights = await prisma.flight.findMany({
    where,
    include: { meta: true, route: true },
    orderBy: { departureTime: "asc" },
  });

  const mapFlight = async (f: FlightWithMetaAndRoute) => {
    const classCapacity = await getClassCapacitySummary(f.id);
    const meta = (f.meta?.data || {}) as Record<string, any>;
    const basePrice = Number(meta.basePrice || f.route?.basePrice || 220);
    const departAt = f.departureTime?.toISOString();
    const arriveAt = f.arrivalTime?.toISOString();
    return {
      ...f,
      flight_number: f.flightNumber,
      flightNumber: f.flightNumber,
      departAt,
      arriveAt,
      airline: meta.airline || "KQ",
      stops: Number(meta.stops || 0),
      aircraft: meta.aircraft || f.aircraftId || "Boeing 787 Dreamliner",
      terminal: meta.terminal || "1",
      durationMinutes:
        f.departureTime && f.arrivalTime
          ? Math.max(0, Math.round((f.arrivalTime.getTime() - f.departureTime.getTime()) / 60000))
          : 0,
      basePrice,
      priceKES: convertUsdToKes(basePrice),
      departure_time: f.departureTime,
      arrival_time: f.arrivalTime,
      is_active: meta.is_active ?? 1,
      is_archived: meta.is_archived ?? 0,
      classCapacity,
      seatsAvailable: Object.fromEntries(classCapacity.map((entry) => [entry.code, entry.available])),
      refundable: Boolean(meta.refundable ?? true),
      baggageIncluded: Boolean(meta.baggageIncluded ?? true),
      mealIncluded: Boolean(meta.mealIncluded ?? false),
      wifiAvailable: Boolean(meta.wifiAvailable ?? false),
    };
  };

  type MappedFlight = Awaited<ReturnType<typeof mapFlight>>;
  const mapped: MappedFlight[] = await Promise.all(flights.map(mapFlight));

  let results = mapped.filter((flight) => flight.is_archived !== 1);
  if (cabin) {
    results = results.filter((flight) =>
      flight.classCapacity.some(
        (entry: { code: string; available: number }) => entry.code === cabin && Number(entry.available || 0) > 0,
      ),
    );
  }

  const priceMin = parseNumber(url.searchParams.get("priceMin"));
  const priceMax = parseNumber(url.searchParams.get("priceMax"));
  const durationMax = parseNumber(url.searchParams.get("durationMax"));
  const directOnly = parseBoolean(url.searchParams.get("directOnly"));
  const seatsMin = parseNumber(url.searchParams.get("seatsMin"));
  const refundable = parseBoolean(url.searchParams.get("refundable"));
  const baggageIncluded = parseBoolean(url.searchParams.get("baggageIncluded"));

  const priceField = currency === "KES" ? "priceKES" : "basePrice";
  if (priceMin !== undefined) results = results.filter((flight) => Number((flight as any)[priceField]) >= priceMin);
  if (priceMax !== undefined) results = results.filter((flight) => Number((flight as any)[priceField]) <= priceMax);
  if (durationMax !== undefined) results = results.filter((flight) => flight.durationMinutes <= durationMax);
  if (directOnly) results = results.filter((flight) => Number(flight.stops || 0) === 0);
  if (seatsMin !== undefined)
    results = results.filter((flight) =>
      flight.classCapacity.some(
        (entry: { code: string; available: number }) => Number(entry.available || 0) >= seatsMin,
      ),
    );
  if (refundable !== undefined) results = results.filter((flight) => flight.refundable === refundable);
  if (baggageIncluded !== undefined) results = results.filter((flight) => flight.baggageIncluded === baggageIncluded);

  if (sort === "price") {
    results.sort((a, b) => Number((a as any)[priceField]) - Number((b as any)[priceField]));
  } else if (sort === "duration") {
    results.sort((a, b) => a.durationMinutes - b.durationMinutes);
  }

  return NextResponse.json({ flights: results, results, total: results.length });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { flight_number, origin, destination, departure_time, arrival_time } = body;

  if (!flight_number || !origin || !destination || !departure_time || !arrival_time) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Create flight and associated base route if needed,
  // but for simplicity we'll just store the flight and meta.
  // Note: price_economy, etc. were in old SQLite schema. In new Prisma schema, they belong to Route or we just ignore for now if missing from Flight model.

  const flight = await prisma.flight.create({
    data: {
      flightNumber: flight_number,
      origin,
      destination,
      departureTime: new Date(departure_time),
      arrivalTime: new Date(arrival_time),
      meta: {
        create: {
          data: { is_active: 1, is_archived: 0 },
        },
      },
    },
    include: { meta: true },
  });

  const seatPlan = [
    { seatClass: "FIRST", prefix: "A", count: 20 },
    { seatClass: "BUSINESS", prefix: "B", count: 60 },
    { seatClass: "ECONOMY", prefix: "C", count: 120 },
  ];
  await prisma.seat.createMany({
    data: seatPlan.flatMap((plan) =>
      Array.from({ length: plan.count }, (_, index) => ({
        flightId: flight.id,
        seatClass: plan.seatClass as any,
        seatNumber: `${plan.prefix}${index + 1}`,
      })),
    ),
    skipDuplicates: true,
  });

  return NextResponse.json(
    {
      flight: {
        ...flight,
        flight_number: flight.flightNumber,
        departure_time: flight.departureTime,
        arrival_time: flight.arrivalTime,
        is_active: 1,
        classCapacity: REQUIRED_TRAVEL_CLASSES,
      },
    },
    { status: 201 },
  );
}
