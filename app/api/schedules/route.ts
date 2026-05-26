import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

type FlightScheduleRow = Awaited<ReturnType<typeof prisma.flightSchedule.findMany>>[number];

export async function GET(request: Request) {
  const rows = await prisma.flightSchedule.findMany({
    include: {
      flight: {
        select: { flightNumber: true },
      },
      aircraft: {
        select: { registration: true },
      },
      gate: {
        select: { gateCode: true },
      },
    },
    orderBy: { departureTime: "asc" },
  });

  const mapped = rows.map((s: FlightScheduleRow) => ({
    ...s,
    flight_number: s.flight?.flightNumber,
    aircraft_registration: s.aircraft?.registration,
    gate_code: s.gate?.gateCode,
  }));

  return NextResponse.json({ schedules: mapped });
}

export async function POST(request: Request) {
  const body: any = await request.json().catch(() => ({}));
  const {
    flight_id,
    route_id, // route is on flight in our new schema, not schedule, we'll ignore or pass
    departure_time,
    arrival_time,
    boarding_time,
    departure_timezone,
    arrival_timezone,
    aircraft_id,
    gate_id,
  } = body;

  if (!flight_id || !departure_time || !arrival_time)
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const schedule = await prisma.flightSchedule.create({
    data: {
      flightId: flight_id,
      departureTime: new Date(departure_time),
      arrivalTime: arrival_time ? new Date(arrival_time) : null,
      aircraftId: aircraft_id || null,
      gateId: gate_id || null,
      status: "SCHEDULED",
    },
    include: {
      flight: { select: { flightNumber: true } },
    },
  });

  return NextResponse.json(
    {
      schedule: {
        ...schedule,
        flight_number: schedule.flight?.flightNumber,
      },
    },
    { status: 201 },
  );
}
