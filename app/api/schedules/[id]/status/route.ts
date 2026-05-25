import { NextResponse } from "next/server";
import { query } from "../../../../../lib/db";
import { notifyPassengersForFlight } from "../../../../../lib/notifications";

export async function POST(request: Request, context: any) {
  const scheduleId = context?.params?.id;
  const body: any = await request.json().catch(() => ({}));
  const { status, reason, note, actor, delay_minutes } = body;
  if (!status)
    return NextResponse.json({ error: "missing_status" }, { status: 400 });

  const schedule: any = query.get(
    `SELECT * FROM flight_schedules WHERE id = ?`,
    [scheduleId],
  );
  if (!schedule)
    return NextResponse.json({ error: "schedule_not_found" }, { status: 404 });

  // Update schedule status and optional delay
  const updates: any[] = [];
  const setParts: string[] = [];
  setParts.push(`status = ?`);
  updates.push(status);
  if (typeof delay_minutes !== "undefined") {
    setParts.push(`delay_minutes = ?`);
    updates.push(Number(delay_minutes) || 0);
  }
  updates.push(scheduleId);
  query.run(
    `UPDATE flight_schedules SET ${setParts.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    updates,
  );

  // insert status update record
  const updateId =
    (globalThis as any).crypto?.randomUUID?.() ||
    String(Date.now()) + Math.random().toString(36).slice(2);
  query.run(
    `INSERT INTO flight_status_updates (id, schedule_id, status, reason, note, actor) VALUES (?, ?, ?, ?, ?, ?)`,
    [updateId, scheduleId, status, reason || null, note || null, actor || null],
  );

  // Notify passengers associated with the flight
  let notified = 0;
  try {
    notified = await notifyPassengersForFlight(schedule.flight_id, {
      status,
      reason,
      note,
      actor,
    });
    // update record with notified count
    query.run(
      `UPDATE flight_status_updates SET notified_passengers_count = ? WHERE id = ?`,
      [notified, updateId],
    );
  } catch (e) {
    // swallow notification errors but keep update logged
  }

  const updated = query.get(`SELECT * FROM flight_schedules WHERE id = ?`, [
    scheduleId,
  ]);
  return NextResponse.json({
    schedule: updated,
    status_update_id: updateId,
    notified,
  });
}
