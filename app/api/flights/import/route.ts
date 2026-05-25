import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";

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
    if (!obj.id)
      obj.id =
        (globalThis as any).crypto?.randomUUID?.() || `${Date.now()}-${i}`;
    // Basic required fields check
    if (
      !obj.flight_number ||
      !obj.origin ||
      !obj.destination ||
      !obj.departure_time ||
      !obj.arrival_time
    )
      continue;
    query.run(
      `INSERT OR REPLACE INTO flights (id, flight_number, origin, destination, departure_time, arrival_time, price_economy, price_business, price_first) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        obj.id,
        obj.flight_number,
        obj.origin,
        obj.destination,
        obj.departure_time,
        obj.arrival_time,
        Number(obj.price_economy) || 0,
        Number(obj.price_business) || 0,
        Number(obj.price_first) || 0,
      ],
    );
    query.run(
      `INSERT OR REPLACE INTO flight_meta (flight_id, is_active, is_archived) VALUES (?, ?, ?)`,
      [obj.id, 1, 0],
    );
    created.push(obj);
  }
  return NextResponse.json({ created });
}
