import { NextResponse } from "next/server";
import { findAssignmentMatches } from "../../../../lib/staff-assignments";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scheduleId = url.searchParams.get("scheduleId") || undefined;
  return NextResponse.json({ matches: await findAssignmentMatches(scheduleId) });
}
