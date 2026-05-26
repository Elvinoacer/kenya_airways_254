import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || undefined;
  
  if (url.searchParams.get("export") === "csv") {
    const rows = await prisma.flight.findMany({
      orderBy: { departureTime: "asc" }
    });
    
    const headers = [
      "id",
      "flight_number",
      "origin",
      "destination",
      "departure_time",
      "arrival_time",
    ];
    
    const csv = [headers.join(",")]
      .concat(
        rows.map((r: any) =>
          headers.map((h) => {
            const key = h === 'flight_number' ? 'flightNumber' : h === 'departure_time' ? 'departureTime' : h === 'arrival_time' ? 'arrivalTime' : h;
            return JSON.stringify(r[key] ?? "");
          }).join(","),
        ),
      )
      .join("\n");
      
    return new NextResponse(csv, {
      status: 200,
      headers: { "Content-Type": "text/csv" },
    });
  }

  const where: any = {};
  if (q) {
    where.OR = [
      { flightNumber: { contains: q, mode: 'insensitive' } },
      { origin: { contains: q, mode: 'insensitive' } },
      { destination: { contains: q, mode: 'insensitive' } },
    ];
  }
  
  const flights = await prisma.flight.findMany({
    where,
    include: { meta: true },
    orderBy: { departureTime: "asc" }
  });
  
  const mapped = flights.map(f => ({
    ...f,
    flight_number: f.flightNumber,
    departure_time: f.departureTime,
    arrival_time: f.arrivalTime,
    is_active: f.meta?.data ? (f.meta.data as any).is_active ?? 1 : 1,
    is_archived: f.meta?.data ? (f.meta.data as any).is_archived ?? 0 : 0
  }));
  
  return NextResponse.json({ flights: mapped });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const {
    flight_number,
    origin,
    destination,
    departure_time,
    arrival_time,
    price_economy = 0,
    price_business = 0,
    price_first = 0,
  } = body;
  
  if (
    !flight_number ||
    !origin ||
    !destination ||
    !departure_time ||
    !arrival_time
  ) {
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
          data: { is_active: 1, is_archived: 0 }
        }
      }
    },
    include: { meta: true }
  });
  
  return NextResponse.json({ 
    flight: {
      ...flight,
      flight_number: flight.flightNumber,
      departure_time: flight.departureTime,
      arrival_time: flight.arrivalTime,
      is_active: 1
    } 
  }, { status: 201 });
}
