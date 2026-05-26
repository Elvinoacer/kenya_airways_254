import { prisma } from "./prisma";

function actorName(actor?: any) {
  return typeof actor === "string" ? actor : actor?.userId || actor?.email || "system";
}

function mapAssignment(assignment: any) {
  return {
    id: assignment.id,
    flight_schedule_id: assignment.flightScheduleId,
    flight_id: assignment.flightId,
    flight_number: assignment.flight?.flightNumber || assignment.flightSchedule?.flight?.flightNumber,
    departure_time: assignment.flightSchedule?.departureTime,
    employee_id: assignment.employeeId,
    first_name: assignment.employee?.firstName,
    last_name: assignment.employee?.lastName,
    employee_role: assignment.employee?.employeeRole,
    assignment_role: assignment.assignmentRole,
    status: assignment.status,
    source: assignment.source,
    match_score: assignment.matchScore,
    match_reason: assignment.matchReason,
    conflict_reason: assignment.conflictReason,
    open_text: assignment.openText,
    required_count: assignment.requiredCount,
    notes: assignment.notes,
    created_at: assignment.createdAt,
    updated_at: assignment.updatedAt,
  };
}

async function logAssignment(assignmentId: string, action: string, actor?: any, details?: any) {
  await prisma.staffAssignmentHistory.create({
    data: {
      assignmentId,
      action,
      actor: actorName(actor),
      detailsJson: details ? JSON.stringify(details) : null,
    },
  });
}

export async function getStaffAssignmentsForSchedule(scheduleId: string) {
  return prisma.staffAssignment.findMany({
    where: { flightScheduleId: scheduleId },
    include: { employee: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function assignStaffToSchedule(
  scheduleId: string,
  employeeId: string,
  role: string,
  actor?: string,
) {
  const schedule = await prisma.flightSchedule.findUnique({
    where: { id: scheduleId },
    include: { flight: true },
  });
  if (!schedule) throw new Error("Schedule not found");

  const assignment = await prisma.staffAssignment.create({
    data: {
      flightScheduleId: scheduleId,
      flightId: schedule.flightId,
      employeeId,
      assignmentRole: role,
      status: "ASSIGNED",
      source: "MANUAL",
    },
  });

  await logAssignment(assignment.id, "ASSIGNED", actor);
  return assignment;
}

export async function removeStaffFromSchedule(assignmentId: string, actor?: string) {
  const assignment = await prisma.staffAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) throw new Error("Assignment not found");

  const updated = await prisma.staffAssignment.update({
    where: { id: assignmentId },
    data: { status: "CANCELLED", employeeId: null },
  });

  await logAssignment(assignmentId, "REMOVED", actor);
  return updated;
}

export async function listAssignments(filters: any = {}) {
  const where: any = {};
  if (filters.scheduleId) where.flightScheduleId = filters.scheduleId;
  if (filters.employeeId) where.employeeId = filters.employeeId;
  if (filters.status) where.status = filters.status;
  if (filters.role) where.assignmentRole = filters.role;

  const rows = await prisma.staffAssignment.findMany({
    where,
    include: {
      employee: true,
      flight: true,
      flightSchedule: { include: { flight: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(mapAssignment);
}

export async function getAssignmentDetails(id: string) {
  const assignment = await prisma.staffAssignment.findUnique({
    where: { id },
    include: {
      employee: true,
      flight: true,
      flightSchedule: { include: { flight: true } },
      history: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!assignment) return null;
  return {
    ...mapAssignment(assignment),
    history: assignment.history.map((entry) => ({
      id: entry.id,
      action: entry.action,
      actor: entry.actor,
      reason: entry.detailsJson,
      created_at: entry.createdAt,
    })),
  };
}

export async function createStaffAssignment(data: any) {
  const schedule = await prisma.flightSchedule.findUnique({
    where: { id: data.flightScheduleId },
    include: { flight: true },
  });
  if (!schedule) throw new Error("Schedule not found");

  const assignment = await prisma.staffAssignment.create({
    data: {
      flightScheduleId: data.flightScheduleId,
      flightId: schedule.flightId,
      employeeId: data.employeeId || null,
      assignmentRole: data.role,
      requiredCount: Number(data.requiredCount) || 1,
      status: data.approvalRequired
        ? "PENDING_APPROVAL"
        : data.employeeId
          ? "ASSIGNED"
          : "OPEN",
      source: data.source || (data.employeeId ? "MANUAL" : "OPENING"),
      openText: data.openText || null,
      notes: data.notes || null,
      metadataJson: JSON.stringify({ approvalRequired: Boolean(data.approvalRequired) }),
    },
  });
  await logAssignment(assignment.id, "CREATED", data.actor, data);
  return getAssignmentDetails(assignment.id);
}

export async function approveAssignment(id: string, actor: any) {
  const assignment = await prisma.staffAssignment.update({
    where: { id },
    data: { status: "APPROVED", approvedBy: actorName(actor) },
  });
  await logAssignment(id, "APPROVED", actor);
  return getAssignmentDetails(assignment.id);
}

export async function rejectAssignment(id: string, actor: any, reason: string) {
  const assignment = await prisma.staffAssignment.update({
    where: { id },
    data: { status: "REJECTED", rejectedBy: actorName(actor), conflictReason: reason || null },
  });
  await logAssignment(id, "REJECTED", actor, { reason });
  return getAssignmentDetails(assignment.id);
}

export async function assignEmployeeToSchedule(id: string, actor: any, employeeId?: string) {
  const current = await prisma.staffAssignment.findUnique({ where: { id } });
  if (!current) throw new Error("Assignment not found");
  const chosenEmployeeId = employeeId || current.employeeId;
  if (!chosenEmployeeId) throw new Error("No employee selected");

  const conflict = await prisma.staffAssignment.findFirst({
    where: {
      id: { not: id },
      employeeId: chosenEmployeeId,
      flightScheduleId: current.flightScheduleId,
      status: { in: ["ASSIGNED", "APPROVED", "COMPLETED"] },
    },
  });

  const assignment = await prisma.staffAssignment.update({
    where: { id },
    data: {
      employeeId: chosenEmployeeId,
      status: conflict ? "CONFLICT" : "ASSIGNED",
      conflictReason: conflict ? "Employee is already assigned to this schedule" : null,
      source: current.source === "OPEN" ? "MATCHED" : current.source,
      matchScore: current.matchScore || 80,
      matchReason: current.matchReason || "Assigned to opening",
    },
  });
  await logAssignment(id, conflict ? "CONFLICT" : "ASSIGNED", actor, { employeeId: chosenEmployeeId });
  return getAssignmentDetails(assignment.id);
}

export async function completeAssignment(id: string, actor: any) {
  const assignment = await prisma.staffAssignment.update({
    where: { id },
    data: { status: "COMPLETED", completedBy: actorName(actor), endedAt: new Date() },
  });
  await logAssignment(id, "COMPLETED", actor);
  return getAssignmentDetails(assignment.id);
}

export async function cancelAssignment(id: string, actor: any, reason: string) {
  const assignment = await prisma.staffAssignment.update({
    where: { id },
    data: { status: "CANCELLED", conflictReason: reason || null },
  });
  await logAssignment(id, "CANCELLED", actor, { reason });
  return getAssignmentDetails(assignment.id);
}

export async function listFlightStaffingRequirements(scheduleId?: string) {
  const rows = await prisma.flightStaffingRequirement.findMany({
    where: scheduleId ? { flightScheduleId: scheduleId } : {},
    include: { flightSchedule: { include: { flight: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    flight_schedule_id: row.flightScheduleId,
    flight_number: row.flightSchedule.flight?.flightNumber,
    role: row.role,
    required_count: row.requiredCount,
    notes: row.notes,
    created_at: row.createdAt,
  }));
}

export async function setFlightStaffingRequirements(data: any) {
  const requirement = await prisma.flightStaffingRequirement.create({
    data: {
      flightScheduleId: data.flightScheduleId,
      role: data.role,
      requiredCount: Number(data.requiredCount) || 1,
      notes: data.notes || null,
    },
  });
  return requirement;
}

function roleScore(employeeRole: string, requiredRole: string) {
  const employee = employeeRole.toUpperCase();
  const required = requiredRole.toUpperCase();
  if (employee === required) return 70;
  if (employee.includes(required) || required.includes(employee)) return 55;
  if (required === "CABIN_CREW" && employee.includes("CREW")) return 60;
  if (required === "GROUND_STAFF" && employee.includes("GROUND")) return 60;
  if (["PILOT", "CAPTAIN", "FIRST_OFFICER"].includes(required) && employee.includes("PILOT")) return 50;
  return 15;
}

export async function findAssignmentMatches(scheduleId?: string) {
  const requirements = await prisma.flightStaffingRequirement.findMany({
    where: scheduleId ? { flightScheduleId: scheduleId } : {},
    include: { flightSchedule: { include: { flight: true } } },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    include: { staffAssignments: true, availability: true },
  });

  return requirements.map((requirement) => {
    const candidates = employees
      .map((employee) => {
        const existingConflict = employee.staffAssignments.some(
          (assignment) =>
            assignment.flightScheduleId === requirement.flightScheduleId &&
            ["ASSIGNED", "APPROVED", "COMPLETED"].includes(assignment.status),
        );
        const score = Math.max(
          0,
          roleScore(employee.employeeRole, requirement.role) +
            (employee.availability.length ? 20 : 0) -
            (existingConflict ? 50 : 0),
        );
        return {
          employeeId: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          role: employee.employeeRole,
          score,
          conflict: existingConflict ? "Already assigned to this schedule" : null,
        };
      })
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score);

    return {
      schedule: {
        id: requirement.flightScheduleId,
        flight_id: requirement.flightSchedule.flightId,
        flight_number: requirement.flightSchedule.flight?.flightNumber,
        departure_time: requirement.flightSchedule.departureTime,
      },
      requirement: {
        id: requirement.id,
        role: requirement.role,
        required_count: requirement.requiredCount,
      },
      candidates,
    };
  });
}

export async function getAssignmentReport() {
  const assignments = await listAssignments({});
  const successfulMatches = assignments.filter((assignment) =>
    ["ASSIGNED", "APPROVED", "COMPLETED"].includes(assignment.status),
  );
  return {
    totalAssignments: assignments.length,
    openAssignments: assignments.filter((assignment) => assignment.status === "OPEN").length,
    conflictAssignments: assignments.filter((assignment) => assignment.status === "CONFLICT").length,
    successfulMatches: successfulMatches.length,
    rows: assignments,
  };
}
