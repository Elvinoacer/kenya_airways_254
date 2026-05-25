import { NextResponse } from "next/server";
import {
  addEmployeeSchedule,
  listEmployeeSchedules,
} from "../../../../../lib/employees";

export async function GET(_request: Request, context: any) {
  return NextResponse.json({
    schedules: listEmployeeSchedules(context?.params?.id),
  });
}

export async function POST(request: Request, context: any) {
  const body: any = await request.json().catch(() => ({}));
  try {
    const schedule = addEmployeeSchedule(
      context?.params?.id,
      {
        scheduleDate: body.scheduleDate,
        shiftStart: body.shiftStart,
        shiftEnd: body.shiftEnd,
        timezone: body.timezone,
        status: body.status,
        location: body.location,
        notes: body.notes,
      },
      body.actor,
    );
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "error" },
      { status: 400 },
    );
  }
}
