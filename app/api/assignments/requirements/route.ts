import { NextResponse } from "next/server";
import {
  listFlightStaffingRequirements,
  setFlightStaffingRequirements,
} from "../../../../lib/staff-assignments";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scheduleId = url.searchParams.get("scheduleId") || undefined;
  return NextResponse.json({
    requirements: listFlightStaffingRequirements(scheduleId),
  });
}

export async function POST(request: Request) {
  const body: any = await request.json().catch(() => ({}));
  if (!body.flightScheduleId || !body.role) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const requirement = setFlightStaffingRequirements({
    flightScheduleId: body.flightScheduleId,
    role: body.role,
    requiredCount: body.requiredCount,
    notes: body.notes,
    actor: body.actor,
  });
  return NextResponse.json({ requirement }, { status: 201 });
}
