import { NextResponse } from "next/server";
import { query } from "../../../../../lib/db";

export async function GET(request: Request, context: any) {
  const flightId = context?.params?.id;
  const rows = query.all(
    `SELECT * FROM flight_schedules WHERE flight_id = ? ORDER BY departure_time`,
    [flightId],
  );
  return NextResponse.json({ schedules: rows });
}

export async function POST(request: Request, context: any) {
  // create schedule for flight
  const flightId = context?.params?.id;
  const body: any = await request.json().catch(() => ({}));
  const {
    departure_time,
    arrival_time,
    boarding_time,
    departure_timezone,
    arrival_timezone,
    aircraft_id,
    gate_id,
    route_id,
  } = body;
  if (!departure_time || !arrival_time)
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const id = (globalThis as any).crypto?.randomUUID?.() || String(Date.now());
  query.run(
    `INSERT INTO flight_schedules (id, flight_id, route_id, departure_time, departure_timezone, arrival_time, arrival_timezone, boarding_time, aircraft_id, gate_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      flightId,
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
  const created = query.get(`SELECT * FROM flight_schedules WHERE id = ?`, [
    id,
  ]);
  return NextResponse.json({ schedule: created }, { status: 201 });
}

export async function PUT(request: Request, context: any) {
  const flightId = context?.params?.id;
  const body: any = await request.json().catch(() => ({}));
  const scheduleId = body.id;
  if (!scheduleId)
    return NextResponse.json({ error: "missing_schedule_id" }, { status: 400 });
  const fields = [
    "departure_time",
    "arrival_time",
    "boarding_time",
    "departure_timezone",
    "arrival_timezone",
    "aircraft_id",
    "gate_id",
    "status",
    "delay_minutes",
    "route_id",
  ];
  const sets: string[] = [];
  const params: any[] = [];
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(body, f)) {
      sets.push(`${f} = ?`);
      params.push(body[f]);
    }
  }
  if (sets.length) {
    params.push(scheduleId);
    query.run(
      `UPDATE flight_schedules SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params,
    );
  }
  const updated = query.get(`SELECT * FROM flight_schedules WHERE id = ?`, [
    scheduleId,
  ]);
  return NextResponse.json({ schedule: updated });
}
