import { NextResponse } from "next/server";
import {
  addEmployeeAvailability,
  listEmployeeAvailability,
} from "../../../../../lib/employees";

export async function GET(_request: Request, context: any) {
  return NextResponse.json({
    availability: listEmployeeAvailability(context?.params?.id),
  });
}

export async function POST(request: Request, context: any) {
  const body: any = await request.json().catch(() => ({}));
  try {
    const availability = addEmployeeAvailability(
      context?.params?.id,
      {
        availabilityDate: body.availabilityDate,
        dayOfWeek: body.dayOfWeek,
        availableFrom: body.availableFrom,
        availableTo: body.availableTo,
        timezone: body.timezone,
        status: body.status,
        notes: body.notes,
      },
      body.actor,
    );
    return NextResponse.json({ availability }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "error" },
      { status: 400 },
    );
  }
}
