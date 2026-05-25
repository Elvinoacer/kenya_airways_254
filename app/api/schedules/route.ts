import { NextResponse } from "next/server";
import { query } from "../../../lib/db";

export async function GET(request: Request) {
  const rows = query.all(
    `SELECT s.*, f.flight_number, a.registration as aircraft_registration, g.gate_code FROM flight_schedules s LEFT JOIN flights f ON f.id = s.flight_id LEFT JOIN aircraft a ON a.id = s.aircraft_id LEFT JOIN gates g ON g.id = s.gate_id ORDER BY s.departure_time`,
  );
  return NextResponse.json({ schedules: rows });
}

export async function POST(request: Request) {
  const body: any = await request.json().catch(() => ({}));
  const {
    flight_id,
    route_id,
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
  const id = (globalThis as any).crypto?.randomUUID?.() || String(Date.now());
  query.run(
    `INSERT INTO flight_schedules (id, flight_id, route_id, departure_time, departure_timezone, arrival_time, arrival_timezone, boarding_time, aircraft_id, gate_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      flight_id,
      route_id || null,
      departure_time,
      departure_timezone || null,
      arrival_time,
      arrival_timezone || null,
      boarding_time || null,
      aircraft_id || null,
      gate_id || null,
    ],
  );
  const created = query.get(
    `SELECT s.*, f.flight_number FROM flight_schedules s LEFT JOIN flights f ON f.id = s.flight_id WHERE s.id = ?`,
    [id],
  );
  return NextResponse.json({ schedule: created }, { status: 201 });
}
