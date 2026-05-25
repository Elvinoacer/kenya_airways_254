import { query } from "./db";
import { sendEmail, sendSms } from "./notifications";

export type AssignmentStatus =
  | "OPEN"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "ASSIGNED"
  | "REJECTED"
  | "CONFLICT"
  | "CANCELLED"
  | "COMPLETED";

export type AssignmentSource = "MANUAL" | "MATCHED" | "AUTO";

export type StaffingRequirementInput = {
  flightScheduleId: string;
  role: string;
  requiredCount?: number;
  notes?: string;
  actor?: string;
};

export type AssignmentCreateInput = {
  flightScheduleId: string;
  employeeId?: string | null;
  role: string;
  requiredCount?: number;
  source?: AssignmentSource;
  approvalRequired?: boolean;
  openText?: string;
  notes?: string;
  actor?: string;
};

function makeId() {
  return (
    (globalThis as any).crypto?.randomUUID?.() ||
    String(Date.now()) + Math.random().toString(36).slice(2)
  );
}

function logHistory(
  assignmentId: string,
  action: string,
  details?: Record<string, any>,
  actor?: string,
) {
  query.run(
    `INSERT INTO staff_assignment_history (id, assignment_id, action, details_json, actor) VALUES (?, ?, ?, ?, ?)`,
    [
      makeId(),
      assignmentId,
      action,
      JSON.stringify(details || {}),
      actor || null,
    ],
  );
}

function logEmployeeActivity(
  employeeId: string,
  action: string,
  details?: Record<string, any>,
  actor?: string,
) {
  query.run(
    `INSERT INTO employee_activity_logs (id, employee_id, action, details_json, actor) VALUES (?, ?, ?, ?, ?)`,
    [
      makeId(),
      employeeId,
      action,
      JSON.stringify(details || {}),
      actor || null,
    ],
  );
}

function getSchedule(scheduleId: string) {
  return query.get<any>(
    `SELECT s.*, f.flight_number, f.origin, f.destination FROM flight_schedules s LEFT JOIN flights f ON f.id = s.flight_id WHERE s.id = ?`,
    [scheduleId],
  );
}

function getEmployee(employeeId: string) {
  return query.get<any>(`SELECT * FROM employees WHERE id = ?`, [employeeId]);
}

function getRequirements(scheduleId: string) {
  return query.all<any>(
    `SELECT * FROM flight_staffing_requirements WHERE flight_schedule_id = ? ORDER BY role ASC`,
    [scheduleId],
  );
}

function getAssignment(id: string) {
  return query.get<any>(
    `
      SELECT a.*, e.first_name, e.last_name, e.email, e.phone, e.employee_role, e.department_id, e.status AS employee_status, e.permissions_json, d.name AS department_name
      FROM staff_assignments a
      LEFT JOIN employees e ON e.id = a.employee_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE a.id = ?
    `,
    [id],
  );
}

function getActiveAssignmentsForEmployee(employeeId: string) {
  return query.all<any>(
    `SELECT * FROM staff_assignments WHERE employee_id = ? AND status IN ('OPEN', 'PENDING_APPROVAL', 'APPROVED', 'ASSIGNED', 'CONFLICT') ORDER BY created_at DESC`,
    [employeeId],
  );
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return (
    new Date(aStart).getTime() < new Date(bEnd).getTime() &&
    new Date(bStart).getTime() < new Date(aEnd).getTime()
  );
}

function scheduleWindow(schedule: any) {
  return {
    start: schedule.departure_time,
    end: schedule.arrival_time,
  };
}

function employeeAvailabilityOnDate(employeeId: string, date: string) {
  return query.all<any>(
    `
      SELECT * FROM employee_availability
      WHERE employee_id = ?
        AND (
          availability_date = ?
          OR (day_of_week IS NOT NULL AND day_of_week = CAST(strftime('%w', ?) AS INTEGER))
        )
      ORDER BY CASE WHEN availability_date = ? THEN 0 ELSE 1 END, created_at DESC
    `,
    [employeeId, date, date, date],
  );
}

function detectConflicts(employeeId: string, scheduleId: string) {
  const employee: any = getEmployee(employeeId);
  const schedule: any = getSchedule(scheduleId);
  if (!employee || !schedule) {
    return { ok: false, reason: "missing_employee_or_schedule" };
  }
  if (employee.status !== "ACTIVE") {
    return {
      ok: false,
      reason: `employee_status_${employee.status.toLowerCase()}`,
    };
  }

  const availability = employeeAvailabilityOnDate(
    employeeId,
    String(schedule.departure_time).slice(0, 10),
  );
  if (availability.length) {
    const allowed = availability.some((entry) => {
      if (entry.status === "UNAVAILABLE") return false;
      if (!entry.available_from || !entry.available_to) return true;
      const scheduleStart = String(schedule.departure_time).slice(11, 16);
      return (
        scheduleStart >= entry.available_from &&
        scheduleStart <= entry.available_to
      );
    });
    if (!allowed) {
      return { ok: false, reason: "not_available_on_schedule_date" };
    }
  }

  const scheduleBounds = scheduleWindow(schedule);
  const existingSchedules = query.all<any>(
    `
      SELECT s.*, a.assignment_role, a.status AS assignment_status
      FROM staff_assignments a
      JOIN flight_schedules s ON s.id = a.flight_schedule_id
      WHERE a.employee_id = ? AND a.status IN ('OPEN', 'PENDING_APPROVAL', 'APPROVED', 'ASSIGNED')
    `,
    [employeeId],
  );
  for (const existing of existingSchedules) {
    if (
      overlaps(
        scheduleBounds.start,
        scheduleBounds.end,
        existing.departure_time,
        existing.arrival_time,
      )
    ) {
      return {
        ok: false,
        reason: `conflicts_with_existing_assignment:${existing.id}`,
      };
    }
  }

  const existingEmployeeSchedules = query.all<any>(
    `SELECT * FROM employee_schedules WHERE employee_id = ? AND status IN ('SCHEDULED', 'COMPLETED')`,
    [employeeId],
  );
  for (const existing of existingEmployeeSchedules) {
    const start = `${existing.schedule_date}T${existing.shift_start}:00`;
    const end = `${existing.schedule_date}T${existing.shift_end}:00`;
    if (overlaps(scheduleBounds.start, scheduleBounds.end, start, end)) {
      return {
        ok: false,
        reason: `conflicts_with_employee_shift:${existing.id}`,
      };
    }
  }

  return { ok: true, reason: "ok" };
}

function assignmentScore(employee: any, schedule: any, role: string) {
  let score = 0;
  const reasons: string[] = [];
  if (
    String(employee.employee_role).toUpperCase() === String(role).toUpperCase()
  ) {
    score += 40;
    reasons.push("role-match");
  }
  if (String(employee.status) === "ACTIVE") {
    score += 20;
    reasons.push("active");
  }
  if (employee.department_id) {
    score += 5;
  }
  const permissions = JSON.parse(employee.permissions_json || "[]") as string[];
  if (permissions.includes("crew.assign")) {
    score += 20;
    reasons.push("has-crew-assign-permission");
  }
  if (permissions.includes(`crew.assign.${String(role).toLowerCase()}`)) {
    score += 20;
    reasons.push("role-permission");
  }
  const availability = employeeAvailabilityOnDate(
    employee.id,
    String(schedule.departure_time).slice(0, 10),
  );
  if (availability.some((entry) => entry.status === "AVAILABLE")) {
    score += 10;
    reasons.push("available");
  }
  return { score, reasons };
}

function notifyAssignment(assignment: any, message: string) {
  const email = assignment.email;
  const phone = assignment.phone;
  if (email) {
    void sendEmail(
      email,
      `Crew assignment ${assignment.assignment_role}`,
      message,
    );
  }
  if (phone) {
    void sendSms(phone, message);
  }
}

export function setFlightStaffingRequirements(input: StaffingRequirementInput) {
  const schedule = getSchedule(input.flightScheduleId);
  if (!schedule) throw new Error("Schedule not found");
  const existing = query.get<any>(
    `SELECT * FROM flight_staffing_requirements WHERE flight_schedule_id = ? AND role = ?`,
    [input.flightScheduleId, input.role],
  );
  if (existing) {
    query.run(
      `UPDATE flight_staffing_requirements SET required_count = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [input.requiredCount || 1, input.notes || null, existing.id],
    );
    return query.get(
      `SELECT * FROM flight_staffing_requirements WHERE id = ?`,
      [existing.id],
    );
  }
  const id = makeId();
  query.run(
    `INSERT INTO flight_staffing_requirements (id, flight_schedule_id, role, required_count, notes) VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      input.flightScheduleId,
      input.role,
      input.requiredCount || 1,
      input.notes || null,
    ],
  );
  return query.get(`SELECT * FROM flight_staffing_requirements WHERE id = ?`, [
    id,
  ]);
}

export function listFlightStaffingRequirements(scheduleId?: string) {
  if (scheduleId) {
    return query.all<any>(
      `SELECT * FROM flight_staffing_requirements WHERE flight_schedule_id = ? ORDER BY role ASC`,
      [scheduleId],
    );
  }
  return query.all<any>(`
    SELECT r.*, s.departure_time, s.arrival_time, f.flight_number
    FROM flight_staffing_requirements r
    LEFT JOIN flight_schedules s ON s.id = r.flight_schedule_id
    LEFT JOIN flights f ON f.id = s.flight_id
    ORDER BY s.departure_time DESC, r.role ASC
  `);
}

export function createStaffAssignment(input: AssignmentCreateInput) {
  const schedule = getSchedule(input.flightScheduleId);
  if (!schedule) throw new Error("Schedule not found");
  const id = makeId();
  let status: AssignmentStatus = input.approvalRequired
    ? "PENDING_APPROVAL"
    : "OPEN";
  let conflictReason: string | null = null;
  let matchScore = 0;
  let matchReason = input.openText || null;
  const source = input.source || (input.employeeId ? "MANUAL" : "MATCHED");
  let startedAt: string | null = null;
  if (input.employeeId) {
    const employee: any = getEmployee(input.employeeId);
    if (!employee) throw new Error("Employee not found");
    const conflict = detectConflicts(input.employeeId, input.flightScheduleId);
    if (!conflict.ok) {
      status = "CONFLICT";
      conflictReason = conflict.reason;
      matchReason = conflict.reason;
    } else {
      const scored = assignmentScore(employee, schedule, input.role);
      matchScore = scored.score;
      matchReason = scored.reasons.join(", ") || input.openText || null;
      if (input.approvalRequired) {
        status = "PENDING_APPROVAL";
      } else {
        status = "ASSIGNED";
      }
    }
  }
  if (status === "ASSIGNED") {
    startedAt = new Date().toISOString();
  }
  query.run(
    `INSERT INTO staff_assignments (
      id, flight_schedule_id, flight_id, employee_id, assignment_role, status, source,
      match_score, match_reason, conflict_reason, open_text, required_count, notes, metadata_json,
      started_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      id,
      input.flightScheduleId,
      schedule.flight_id,
      input.employeeId || null,
      input.role,
      status,
      source,
      matchScore,
      matchReason,
      conflictReason,
      input.openText || null,
      input.requiredCount || 1,
      input.notes || null,
      JSON.stringify({
        scheduleId: input.flightScheduleId,
        role: input.role,
        source,
      }),
      startedAt,
    ],
  );
  logHistory(id, "assignment.create", input, input.actor);
  if (input.employeeId) {
    logEmployeeActivity(
      input.employeeId,
      "assignment.create",
      { assignmentId: id, role: input.role, status },
      input.actor,
    );
    if (status === "ASSIGNED") {
      notifyAssignment(
        {
          ...getAssignment(id),
          assignment_role: input.role,
          email: getEmployee(input.employeeId)?.email,
          phone: getEmployee(input.employeeId)?.phone,
        },
        `You have been assigned to flight ${schedule.flight_number || schedule.flight_id} as ${input.role}.`,
      );
    }
  }
  return getAssignment(id);
}

export function listAssignments(
  filters: {
    scheduleId?: string;
    employeeId?: string;
    status?: string;
    role?: string;
  } = {},
) {
  const where: string[] = [];
  const params: any[] = [];
  if (filters.scheduleId) {
    where.push(`a.flight_schedule_id = ?`);
    params.push(filters.scheduleId);
  }
  if (filters.employeeId) {
    where.push(`a.employee_id = ?`);
    params.push(filters.employeeId);
  }
  if (filters.status) {
    where.push(`a.status = ?`);
    params.push(filters.status);
  }
  if (filters.role) {
    where.push(`a.assignment_role = ?`);
    params.push(filters.role);
  }
  const sql = `
    SELECT
      a.*,
      e.first_name,
      e.last_name,
      e.employee_number,
      e.email,
      e.phone,
      e.employee_role,
      d.name AS department_name,
      s.departure_time,
      s.arrival_time,
      s.status AS schedule_status,
      f.flight_number,
      f.origin,
      f.destination
    FROM staff_assignments a
    LEFT JOIN employees e ON e.id = a.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN flight_schedules s ON s.id = a.flight_schedule_id
    LEFT JOIN flights f ON f.id = a.flight_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY a.updated_at DESC, a.created_at DESC
  `;
  return query.all<any>(sql, params);
}

export function getAssignmentDetails(id: string) {
  const assignment = getAssignment(id);
  if (!assignment) return null;
  const history = query.all<any>(
    `SELECT * FROM staff_assignment_history WHERE assignment_id = ? ORDER BY created_at DESC`,
    [id],
  );
  return { ...assignment, history };
}

export function findAssignmentMatches(scheduleId?: string) {
  const schedules = scheduleId
    ? [getSchedule(scheduleId)].filter(Boolean)
    : query.all<any>(
        `SELECT s.*, f.flight_number, f.origin, f.destination FROM flight_schedules s LEFT JOIN flights f ON f.id = s.flight_id ORDER BY s.departure_time ASC LIMIT 50`,
      );
  const results = [] as any[];
  for (const schedule of schedules) {
    const requirements = getRequirements(schedule.id);
    const employees = query.all<any>(
      `SELECT e.*, d.name AS department_name FROM employees e LEFT JOIN departments d ON d.id = e.department_id WHERE e.status = 'ACTIVE' ORDER BY e.updated_at DESC`,
    );
    for (const requirement of requirements) {
      const candidates = employees
        .map((employee) => {
          const conflict = detectConflicts(employee.id, schedule.id);
          const scored = assignmentScore(employee, schedule, requirement.role);
          return {
            employeeId: employee.id,
            employeeNumber: employee.employee_number,
            name: `${employee.first_name} ${employee.last_name}`,
            email: employee.email,
            phone: employee.phone,
            role: employee.employee_role,
            department: employee.department_name,
            conflict: conflict.ok ? null : conflict.reason,
            score: scored.score,
            reasons: scored.reasons,
            available: conflict.ok,
          };
        })
        .filter((candidate) => candidate.available || candidate.score > 0)
        .sort((a, b) => b.score - a.score);
      results.push({ schedule, requirement, candidates });
    }
  }
  return results;
}

export function approveAssignment(id: string, actor?: string) {
  const assignment: any = getAssignment(id);
  if (!assignment) throw new Error("Assignment not found");
  if (assignment.status === "CONFLICT")
    throw new Error("Cannot approve a conflicted assignment");
  query.run(
    `UPDATE staff_assignments SET status = ?, approved_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ["APPROVED", actor || null, id],
  );
  logHistory(id, "assignment.approve", { actor }, actor);
  if (assignment.employee_id) {
    logEmployeeActivity(
      assignment.employee_id,
      "assignment.approve",
      { assignmentId: id },
      actor,
    );
    const schedule = getSchedule(assignment.flight_schedule_id);
    notifyAssignment(
      assignment,
      `Your assignment for flight ${schedule?.flight_number || schedule?.flight_id} as ${assignment.assignment_role} has been approved.`,
    );
  }
  return getAssignment(id);
}

export function rejectAssignment(id: string, actor?: string, reason?: string) {
  const assignment: any = getAssignment(id);
  if (!assignment) throw new Error("Assignment not found");
  query.run(
    `UPDATE staff_assignments SET status = ?, rejected_by = ?, conflict_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ["REJECTED", actor || null, reason || null, id],
  );
  logHistory(id, "assignment.reject", { actor, reason }, actor);
  if (assignment.employee_id) {
    logEmployeeActivity(
      assignment.employee_id,
      "assignment.reject",
      { assignmentId: id, reason },
      actor,
    );
  }
  return getAssignment(id);
}

export function assignEmployeeToSchedule(
  id: string,
  actor?: string,
  employeeId?: string,
) {
  const assignment: any = getAssignment(id);
  if (!assignment) throw new Error("Assignment not found");
  const targetEmployeeId = employeeId || assignment.employee_id;
  if (!targetEmployeeId) throw new Error("Assignment has no employee");
  if (employeeId && employeeId !== assignment.employee_id) {
    query.run(
      `UPDATE staff_assignments SET employee_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [employeeId, id],
    );
  }
  const conflict = detectConflicts(
    targetEmployeeId,
    assignment.flight_schedule_id,
  );
  if (!conflict.ok) {
    query.run(
      `UPDATE staff_assignments SET status = ?, conflict_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      ["CONFLICT", conflict.reason, id],
    );
    logHistory(id, "assignment.conflict", { conflict: conflict.reason }, actor);
    return getAssignment(id);
  }
  query.run(
    `UPDATE staff_assignments SET status = ?, started_at = COALESCE(started_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ["ASSIGNED", id],
  );
  logHistory(id, "assignment.assign", { actor }, actor);
  logEmployeeActivity(
    targetEmployeeId,
    "assignment.assign",
    { assignmentId: id },
    actor,
  );
  const schedule = getSchedule(assignment.flight_schedule_id);
  notifyAssignment(
    { ...assignment, employee_id: targetEmployeeId },
    `You have been assigned to flight ${schedule?.flight_number || schedule?.flight_id} as ${assignment.assignment_role}.`,
  );
  return getAssignment(id);
}

export function cancelAssignment(id: string, actor?: string, reason?: string) {
  const assignment: any = getAssignment(id);
  if (!assignment) throw new Error("Assignment not found");
  query.run(
    `UPDATE staff_assignments SET status = ?, conflict_reason = ?, ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ["CANCELLED", reason || null, id],
  );
  logHistory(id, "assignment.cancel", { actor, reason }, actor);
  if (assignment.employee_id) {
    logEmployeeActivity(
      assignment.employee_id,
      "assignment.cancel",
      { assignmentId: id, reason },
      actor,
    );
  }
  return getAssignment(id);
}

export function completeAssignment(id: string, actor?: string) {
  const assignment: any = getAssignment(id);
  if (!assignment) throw new Error("Assignment not found");
  query.run(
    `UPDATE staff_assignments SET status = ?, completed_by = ?, ended_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ["COMPLETED", actor || null, id],
  );
  logHistory(id, "assignment.complete", { actor }, actor);
  if (assignment.employee_id) {
    logEmployeeActivity(
      assignment.employee_id,
      "assignment.complete",
      { assignmentId: id },
      actor,
    );
  }
  return getAssignment(id);
}

export function getAssignmentReport() {
  const assignments = listAssignments();
  const byStatus = assignments.reduce<
    Record<string, { count: number; open: number }>
  >((acc, assignment) => {
    if (!acc[assignment.status]) acc[assignment.status] = { count: 0, open: 0 };
    acc[assignment.status].count += 1;
    if (!assignment.employee_id) acc[assignment.status].open += 1;
    return acc;
  }, {});
  const conflicts = assignments.filter(
    (assignment) => assignment.status === "CONFLICT",
  );
  const openAssignments = assignments.filter(
    (assignment) =>
      !assignment.employee_id ||
      assignment.status === "OPEN" ||
      assignment.status === "PENDING_APPROVAL",
  );
  return {
    totalAssignments: assignments.length,
    openAssignments: openAssignments.length,
    conflictAssignments: conflicts.length,
    byStatus,
    assignments,
  };
}
