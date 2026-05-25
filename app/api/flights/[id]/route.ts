import { NextResponse } from "next/server";
import { query } from "../../../../lib/db";

export async function GET(request: Request, context: any) {
  const id = context?.params?.id;
  const row = query.get(
    `SELECT f.*, coalesce(m.is_active,1) as is_active, coalesce(m.is_archived,0) as is_archived FROM flights f LEFT JOIN flight_meta m ON m.flight_id = f.id WHERE f.id = ?`,
    [id],
  );
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ flight: row });
}

export async function PUT(request: Request, context: any) {
  const id = context?.params?.id;
  const body: any = await request.json().catch(() => ({}));
  const fields = [
    "flight_number",
    "origin",
    "destination",
    "departure_time",
    "arrival_time",
    "price_economy",
    "price_business",
    "price_first",
  ];
  const updates: any[] = [];
  const setParts: string[] = [];
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(body, f)) {
      setParts.push(`${f} = ?`);
      updates.push(body[f]);
    }
  }
  if (setParts.length) {
    updates.push(id);
    query.run(
      `UPDATE flights SET ${setParts.join(", ")} WHERE id = ?`,
      updates,
    );
  }
  // meta updates
  if (
    body.is_active !== undefined ||
    body.is_archived !== undefined ||
    body.recurrence_rule !== undefined
  ) {
    const meta = query.get(`SELECT * FROM flight_meta WHERE flight_id = ?`, [
      id,
    ]) as any;
    if (meta) {
      query.run(
        `UPDATE flight_meta SET is_active = ?, is_archived = ?, recurrence_rule = ?, updated_at = CURRENT_TIMESTAMP WHERE flight_id = ?`,
        [
          body.is_active !== undefined
            ? body.is_active
              ? 1
              : 0
            : meta.is_active,
          body.is_archived !== undefined
            ? body.is_archived
              ? 1
              : 0
            : meta.is_archived,
          body.recurrence_rule ?? meta.recurrence_rule,
          id,
        ],
      );
    } else {
      query.run(
        `INSERT INTO flight_meta (flight_id, is_active, is_archived, recurrence_rule) VALUES (?, ?, ?, ?)`,
        [
          id,
          body.is_active !== undefined ? (body.is_active ? 1 : 0) : 1,
          body.is_archived !== undefined ? (body.is_archived ? 1 : 0) : 0,
          body.recurrence_rule ?? null,
        ],
      );
    }
  }

  const updated = query.get(
    `SELECT f.*, coalesce(m.is_active,1) as is_active, coalesce(m.is_archived,0) as is_archived FROM flights f LEFT JOIN flight_meta m ON m.flight_id = f.id WHERE f.id = ?`,
    [id],
  );
  return NextResponse.json({ flight: updated });
}

export async function DELETE(request: Request, context: any) {
  const id = context?.params?.id;
  // Soft delete by archiving
  query.run(
    `INSERT OR REPLACE INTO flight_meta (flight_id, is_active, is_archived, updated_at) VALUES (?, 0, 1, CURRENT_TIMESTAMP)`,
    [id],
  );
  return NextResponse.json({ success: true });
}

// custom actions via POST with ?action=duplicate|clone|activate|deactivate|archive
export async function POST(request: Request, context: any) {
  const id = context?.params?.id;
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const body: any = await request.json().catch(() => ({}));
  if (action === "duplicate" || action === "clone") {
    const row: any = query.get(`SELECT * FROM flights WHERE id = ?`, [id]);
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const newId =
      (globalThis as any).crypto?.randomUUID?.() || String(Date.now());
    const newFlightNumber = `${row.flight_number}-copy`;
    query.run(
      `INSERT INTO flights (id, flight_number, origin, destination, departure_time, arrival_time, price_economy, price_business, price_first) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        newFlightNumber,
        row.origin,
        row.destination,
        body.departure_time ?? row.departure_time,
        body.arrival_time ?? row.arrival_time,
        body.price_economy ?? row.price_economy,
        body.price_business ?? row.price_business,
        body.price_first ?? row.price_first,
      ],
    );
    query.run(
      `INSERT INTO flight_meta (flight_id, is_active, is_archived) VALUES (?, 1, 0)`,
      [newId],
    );
    const created = query.get(`SELECT * FROM flights WHERE id = ?`, [newId]);
    return NextResponse.json({ flight: created }, { status: 201 });
  }
  if (
    action === "activate" ||
    action === "deactivate" ||
    action === "archive"
  ) {
    const isActive = action === "activate" ? 1 : 0;
    const isArchived = action === "archive" ? 1 : 0;
    const meta = query.get(`SELECT * FROM flight_meta WHERE flight_id = ?`, [
      id,
    ]);
    if (meta) {
      query.run(
        `UPDATE flight_meta SET is_active = ?, is_archived = ?, updated_at = CURRENT_TIMESTAMP WHERE flight_id = ?`,
        [isActive, isArchived, id],
      );
    } else {
      query.run(
        `INSERT INTO flight_meta (flight_id, is_active, is_archived) VALUES (?, ?, ?)`,
        [id, isActive, isArchived],
      );
    }
    const updated = query.get(
      `SELECT f.*, coalesce(m.is_active,1) as is_active, coalesce(m.is_archived,0) as is_archived FROM flights f LEFT JOIN flight_meta m ON m.flight_id = f.id WHERE f.id = ?`,
      [id],
    );
    return NextResponse.json({ flight: updated });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
