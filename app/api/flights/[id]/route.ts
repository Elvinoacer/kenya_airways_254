import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request: Request, context: any) {
  const id = context?.params?.id;
  const flight = await prisma.flight.findUnique({
    where: { id },
    include: { meta: true }
  });
  
  if (!flight) return NextResponse.json({ error: "not_found" }, { status: 404 });
  
  const metaData = flight.meta?.data as any || {};
  return NextResponse.json({ 
    flight: {
      ...flight,
      flight_number: flight.flightNumber,
      departure_time: flight.departureTime,
      arrival_time: flight.arrivalTime,
      is_active: metaData.is_active ?? 1,
      is_archived: metaData.is_archived ?? 0
    }
  });
}

export async function PUT(request: Request, context: any) {
  const id = context?.params?.id;
  const body: any = await request.json().catch(() => ({}));
  
  const data: any = {};
  if (body.flight_number !== undefined) data.flightNumber = body.flight_number;
  if (body.origin !== undefined) data.origin = body.origin;
  if (body.destination !== undefined) data.destination = body.destination;
  if (body.departure_time !== undefined) data.departureTime = new Date(body.departure_time);
  if (body.arrival_time !== undefined) data.arrivalTime = new Date(body.arrival_time);
  
  if (Object.keys(data).length > 0) {
    await prisma.flight.update({
      where: { id },
      data
    });
  }
  
  // meta updates
  if (
    body.is_active !== undefined ||
    body.is_archived !== undefined ||
    body.recurrence_rule !== undefined
  ) {
    const flightMeta = await prisma.flightMeta.findUnique({ where: { flightId: id } });
    const currentData = flightMeta?.data as any || {};
    
    const nextData = { ...currentData };
    if (body.is_active !== undefined) nextData.is_active = body.is_active ? 1 : 0;
    if (body.is_archived !== undefined) nextData.is_archived = body.is_archived ? 1 : 0;
    if (body.recurrence_rule !== undefined) nextData.recurrence_rule = body.recurrence_rule;
    
    await prisma.flightMeta.upsert({
      where: { flightId: id },
      create: { flightId: id, data: nextData },
      update: { data: nextData }
    });
  }

  const updated = await prisma.flight.findUnique({
    where: { id },
    include: { meta: true }
  });
  
  const metaData = updated?.meta?.data as any || {};
  return NextResponse.json({ 
    flight: {
      ...updated,
      flight_number: updated?.flightNumber,
      departure_time: updated?.departureTime,
      arrival_time: updated?.arrivalTime,
      is_active: metaData.is_active ?? 1,
      is_archived: metaData.is_archived ?? 0
    }
  });
}

export async function DELETE(request: Request, context: any) {
  const id = context?.params?.id;
  // Soft delete by archiving
  const flightMeta = await prisma.flightMeta.findUnique({ where: { flightId: id } });
  const currentData = flightMeta?.data as any || {};
  currentData.is_active = 0;
  currentData.is_archived = 1;
  
  await prisma.flightMeta.upsert({
    where: { flightId: id },
    create: { flightId: id, data: currentData },
    update: { data: currentData }
  });
  
  return NextResponse.json({ success: true });
}

// custom actions via POST with ?action=duplicate|clone|activate|deactivate|archive
export async function POST(request: Request, context: any) {
  const id = context?.params?.id;
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const body: any = await request.json().catch(() => ({}));
  
  if (action === "duplicate" || action === "clone") {
    const row = await prisma.flight.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
    
    const newFlightNumber = `${row.flightNumber}-copy`;
    
    const created = await prisma.flight.create({
      data: {
        flightNumber: newFlightNumber,
        origin: row.origin,
        destination: row.destination,
        departureTime: body.departure_time ? new Date(body.departure_time) : row.departureTime,
        arrivalTime: body.arrival_time ? new Date(body.arrival_time) : row.arrivalTime,
        meta: {
          create: {
            data: { is_active: 1, is_archived: 0 }
          }
        }
      },
      include: { meta: true }
    });
    
    return NextResponse.json({ flight: created }, { status: 201 });
  }
  
  if (
    action === "activate" ||
    action === "deactivate" ||
    action === "archive"
  ) {
    const isActive = action === "activate" ? 1 : 0;
    const isArchived = action === "archive" ? 1 : 0;
    
    const flightMeta = await prisma.flightMeta.findUnique({ where: { flightId: id } });
    const currentData = flightMeta?.data as any || {};
    currentData.is_active = isActive;
    currentData.is_archived = isArchived;
    
    await prisma.flightMeta.upsert({
      where: { flightId: id },
      create: { flightId: id, data: currentData },
      update: { data: currentData }
    });
    
    const updated = await prisma.flight.findUnique({
      where: { id },
      include: { meta: true }
    });
    
    const metaData = updated?.meta?.data as any || {};
    return NextResponse.json({ 
      flight: {
        ...updated,
        flight_number: updated?.flightNumber,
        is_active: metaData.is_active ?? 1,
        is_archived: metaData.is_archived ?? 0
      }
    });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
