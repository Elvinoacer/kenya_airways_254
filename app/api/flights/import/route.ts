import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(request: Request) {
  const text = await request.text().catch(() => "");
  if (!text) return NextResponse.json({ error: "empty_body" }, { status: 400 });

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2)
    return NextResponse.json({ error: "no_rows" }, { status: 400 });
    
  const headers = lines[0].split(",").map((h) => h.trim());
  const created: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const obj: any = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = cols[j] ?? "";
    
    if (
      !obj.flight_number ||
      !obj.origin ||
      !obj.destination ||
      !obj.departure_time ||
      !obj.arrival_time
    )
      continue;
      
    const flight = await prisma.flight.upsert({
      where: { flightNumber: obj.flight_number }, // We use flightNumber as unique identifier instead of id from csv
      create: {
        flightNumber: obj.flight_number,
        origin: obj.origin,
        destination: obj.destination,
        departureTime: new Date(obj.departure_time),
        arrivalTime: new Date(obj.arrival_time),
        meta: {
          create: {
            data: { is_active: 1, is_archived: 0 }
          }
        }
      },
      update: {
        origin: obj.origin,
        destination: obj.destination,
        departureTime: new Date(obj.departure_time),
        arrivalTime: new Date(obj.arrival_time),
      }
    });
    
    created.push(flight);
  }
  return NextResponse.json({ created });
}
