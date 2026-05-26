import { NextResponse } from "next/server";
import { getAssignmentReport } from "../../../../lib/staff-assignments";

export async function GET() {
  return NextResponse.json(await getAssignmentReport());
}
