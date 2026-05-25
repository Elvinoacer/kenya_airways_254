import { NextResponse } from "next/server";
import { listEmployeeActivity } from "../../../../lib/employees";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const employeeId = url.searchParams.get("employeeId") || undefined;
  return NextResponse.json({ activity: listEmployeeActivity(employeeId) });
}
