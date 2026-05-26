import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { notifyPassengersForFlight } from "../../../../../lib/notifications";

export async function POST(request: Request, context: any) {
  const scheduleId = context?.params?.id;
  const body: any = await request.json().catch(() => ({}));
  const { status, reason, note, actor, delay_minutes } = body;
  if (!status)
    return NextResponse.json({ error: "missing_status" }, { status: 400 });

  const schedule = await prisma.flightSchedule.findUnique({
    where: { id: scheduleId }
  });
  
  if (!schedule)
    return NextResponse.json({ error: "schedule_not_found" }, { status: 404 });

  // Update schedule status (delay_minutes is not in our schema, so we skip it or could add to meta)
  await prisma.flightSchedule.update({
    where: { id: scheduleId },
    data: { status: status as any }
  });

  // insert status update record
  const update = await prisma.flightStatusUpdate.create({
    data: {
      scheduleId,
      status,
      reason: reason || null,
      note: note || null,
      actor: actor || null
    }
  });

  // Notify passengers associated with the flight
  let notified = 0;
  try {
    notified = await notifyPassengersForFlight(schedule.flightId, {
      status,
      reason,
      note,
      actor,
    });
    // Notified passengers count is not in Prisma schema for FlightStatusUpdate, so we skip updating it.
  } catch (e) {
    // swallow notification errors but keep update logged
  }

  const updated = await prisma.flightSchedule.findUnique({
    where: { id: scheduleId }
  });
  
  return NextResponse.json({
    schedule: updated,
    status_update_id: update.id,
    notified,
  });
}
