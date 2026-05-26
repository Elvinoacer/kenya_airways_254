import { NextResponse } from "next/server";
import {
  assignEmployeeToSchedule,
  cancelAssignment,
  completeAssignment,
  createStaffAssignment,
  getAssignmentDetails,
  listAssignments,
  approveAssignment,
  rejectAssignment,
} from "../../../lib/staff-assignments";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const assignments = await listAssignments({
    scheduleId: url.searchParams.get("scheduleId") || undefined,
    employeeId: url.searchParams.get("employeeId") || undefined,
    status: url.searchParams.get("status") || undefined,
    role: url.searchParams.get("role") || undefined,
  });
  return NextResponse.json({ assignments });
}

export async function POST(request: Request) {
  const body: any = await request.json().catch(() => ({}));
  if (!body.flightScheduleId || !body.role) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const assignment = await createStaffAssignment({
    flightScheduleId: body.flightScheduleId,
    employeeId: body.employeeId || null,
    role: body.role,
    requiredCount: body.requiredCount,
    source: body.source,
    approvalRequired: Boolean(body.approvalRequired),
    openText: body.openText,
    notes: body.notes,
    actor: body.actor,
  });
  return NextResponse.json({ assignment }, { status: 201 });
}

export async function PATCH(request: Request) {
  const body: any = await request.json().catch(() => ({}));
  const { id, action, actor, reason } = body || {};
  if (!id || !action) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  try {
    let assignment;
    switch (String(action).toUpperCase()) {
      case "APPROVE":
        assignment = await approveAssignment(id, actor);
        break;
      case "REJECT":
        assignment = await rejectAssignment(id, actor, reason);
        break;
      case "ASSIGN":
        assignment = await assignEmployeeToSchedule(
          id,
          actor,
          body.employeeId || undefined,
        );
        break;
      case "COMPLETE":
        assignment = await completeAssignment(id, actor);
        break;
      case "CANCEL":
        assignment = await cancelAssignment(id, actor, reason);
        break;
      default:
        return NextResponse.json(
          { error: "unsupported_action" },
          { status: 400 },
        );
    }
    return NextResponse.json({ assignment });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "error" },
      { status: 400 },
    );
  }
}
