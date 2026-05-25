import { NextResponse } from "next/server";
import { query } from "../../../lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || undefined;
  if (url.searchParams.get("export") === "csv") {
    const rows = query.all(`SELECT * FROM flights ORDER BY departure_time`);
    const headers = [
      "id",
      "flight_number",
      "origin",
      "destination",
      "departure_time",
      "arrival_time",
      "price_economy",
      "price_business",
      "price_first",
    ];
    const csv = [headers.join(",")]
      .concat(
        rows.map((r: any) =>
          headers.map((h) => JSON.stringify(r[h] ?? "")).join(","),
        ),
      )
      .join("\n");
    return new NextResponse(csv, {
      status: 200,
      headers: { "Content-Type": "text/csv" },
    });
  }

  let sql = `SELECT f.*, coalesce(m.is_active,1) as is_active, coalesce(m.is_archived,0) as is_archived FROM flights f LEFT JOIN flight_meta m ON m.flight_id = f.id`;
  const params: any[] = [];
  if (q) {
    sql += ` WHERE flight_number LIKE ? OR origin LIKE ? OR destination LIKE ?`;
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  sql += ` ORDER BY departure_time`;
  const rows = query.all(sql, params);
  return NextResponse.json({ flights: rows });
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
  const id = (globalThis as any).crypto?.randomUUID?.() || String(Date.now());
  query.run(
    `INSERT INTO flights (id, flight_number, origin, destination, departure_time, arrival_time, price_economy, price_business, price_first) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      flight_number,
      origin,
      destination,
      departure_time,
      arrival_time,
      price_economy,
      price_business,
      price_first,
    ],
  );
  // ensure meta exists
  query.run(
    `INSERT OR REPLACE INTO flight_meta (flight_id, is_active, is_archived) VALUES (?, 1, 0)`,
    [id],
  );
  const created = query.get(
    `SELECT f.*, coalesce(m.is_active,1) as is_active FROM flights f LEFT JOIN flight_meta m ON m.flight_id = f.id WHERE f.id = ?`,
    [id],
  );
  return NextResponse.json({ flight: created }, { status: 201 });
}
