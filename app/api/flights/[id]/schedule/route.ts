import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";

export async function GET(request: Request, context: any) {
  const flightId = context?.params?.id;
  const rows = await prisma.flightSchedule.findMany({
    where: { flightId },
    orderBy: { departureTime: "asc" }
  });
  return NextResponse.json({ schedules: rows });
}

export async function POST(request: Request, context: any) {
  // create schedule for flight
  const flightId = context?.params?.id;
  const body: any = await request.json().catch(() => ({}));
  const {
    departure_time,
    arrival_time,
    aircraft_id,
    gate_id,
  } = body;
  
  if (!departure_time || !arrival_time)
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    
  const schedule = await prisma.flightSchedule.create({
    data: {
      flightId,
      departureTime: new Date(departure_time),
      arrivalTime: new Date(arrival_time),
      aircraftId: aircraft_id || null,
      gateId: gate_id || null,
      status: "SCHEDULED"
    }
  });
  
  return NextResponse.json({ schedule }, { status: 201 });
}

export async function PUT(request: Request, context: any) {
  const flightId = context?.params?.id; // unused but standard
  const body: any = await request.json().catch(() => ({}));
  const scheduleId = body.id;
  if (!scheduleId)
    return NextResponse.json({ error: "missing_schedule_id" }, { status: 400 });
    
  const data: any = {};
  if (body.departure_time !== undefined) data.departureTime = new Date(body.departure_time);
  if (body.arrival_time !== undefined) data.arrivalTime = new Date(body.arrival_time);
  if (body.aircraft_id !== undefined) data.aircraftId = body.aircraft_id || null;
  if (body.gate_id !== undefined) data.gateId = body.gate_id || null;
  if (body.status !== undefined) data.status = body.status;
  
  const updated = await prisma.flightSchedule.update({
    where: { id: scheduleId },
    data
  });
  
  return NextResponse.json({ schedule: updated });
}
