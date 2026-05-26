import { NextResponse } from "next/server";
import { getAssignmentDetails } from "../../../../lib/staff-assignments";

export async function GET(_request: Request, context: any) {
  const assignment = await getAssignmentDetails(context?.params?.id);
  if (!assignment)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ assignment });
}
