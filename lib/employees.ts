import { query } from "./db";

export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "SUSPENDED" | "INACTIVE";
export type EmployeeScheduleStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";
export type EmployeeAvailabilityStatus =
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "LIMITED";

export type DepartmentInput = {
  code?: string;
  name: string;
  description?: string;
  managerEmployeeId?: string | null;
  actor?: string;
};

export type EmployeeInput = {
  userId?: string | null;
  employeeNumber?: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  employeeRole: string;
  departmentId?: string | null;
  employmentType?: string;
  status?: EmployeeStatus;
  permissions?: string[];
  profile?: Record<string, any>;
  notes?: string | null;
  hiredAt?: string | null;
  managerEmployeeId?: string | null;
  actor?: string;
};

export type EmployeeFilterInput = {
  q?: string;
  departmentId?: string;
  role?: string;
  status?: string;
  availabilityDate?: string;
};

function makeId() {
  return (
    (globalThis as any).crypto?.randomUUID?.() ||
    String(Date.now()) + Math.random().toString(36).slice(2)
  );
}

function makeEmployeeNumber() {
  return `EMP-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function normalizeText(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseJsonArray(value: string | null) {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((entry) => String(entry)) : [];
  } catch {
    return [] as string[];
  }
}

function parseJsonObject<T extends Record<string, any>>(
  value: string | null,
): T {
  if (!value) return {} as T;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : ({} as T);
  } catch {
    return {} as T;
  }
}

function serialize(value: any) {
  return JSON.stringify(value ?? {});
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

export function listDepartments() {
  return query.all(`SELECT * FROM departments ORDER BY name ASC`);
}

export function getDepartment(id: string) {
  return query.get(`SELECT * FROM departments WHERE id = ?`, [id]);
}

export function createDepartment(input: DepartmentInput) {
  const id = makeId();
  const code =
    (input.code || input.name)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20) || `DEP-${id.slice(0, 8).toUpperCase()}`;
  query.run(
    `INSERT INTO departments (id, code, name, description, manager_employee_id) VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      code,
      input.name.trim(),
      normalizeText(input.description),
      input.managerEmployeeId || null,
    ],
  );
  return query.get(`SELECT * FROM departments WHERE id = ?`, [id]);
}

export function updateDepartment(id: string, input: Partial<DepartmentInput>) {
  const current: any = getDepartment(id);
  if (!current) throw new Error("Department not found");
  const code =
    input.code === undefined ? current.code : input.code || current.code;
  const name = input.name === undefined ? current.name : input.name.trim();
  const description =
    input.description === undefined
      ? current.description
      : normalizeText(input.description);
  const managerEmployeeId =
    input.managerEmployeeId === undefined
      ? current.manager_employee_id
      : input.managerEmployeeId;
  query.run(
    `UPDATE departments SET code = ?, name = ?, description = ?, manager_employee_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [code, name, description, managerEmployeeId || null, id],
  );
  return getDepartment(id);
}

export function deleteDepartment(id: string) {
  const department = getDepartment(id);
  if (!department) throw new Error("Department not found");
  query.run(
    `UPDATE employees SET department_id = NULL WHERE department_id = ?`,
    [id],
  );
  query.run(`DELETE FROM departments WHERE id = ?`, [id]);
  return department;
}

export function createEmployee(input: EmployeeInput) {
  const id = makeId();
  const employeeNumber = input.employeeNumber || makeEmployeeNumber();
  query.run(
    `INSERT INTO employees (
      id, user_id, employee_number, first_name, last_name, email, phone, job_title,
      employee_role, department_id, employment_type, status, permissions_json,
      profile_json, notes, hired_at, manager_employee_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.userId || null,
      employeeNumber,
      input.firstName.trim(),
      input.lastName.trim(),
      normalizeText(input.email),
      normalizeText(input.phone),
      normalizeText(input.jobTitle),
      input.employeeRole.trim(),
      input.departmentId || null,
      input.employmentType || "FULL_TIME",
      input.status || "ACTIVE",
      JSON.stringify(input.permissions || []),
      serialize(input.profile || {}),
      normalizeText(input.notes),
      input.hiredAt || null,
      input.managerEmployeeId || null,
    ],
  );
  const employee = getEmployee(id);
  logEmployeeActivity(
    id,
    "employee.create",
    {
      employeeNumber,
      employeeRole: input.employeeRole,
      departmentId: input.departmentId || null,
    },
    input.actor,
  );
  return employee;
}

export function listEmployees(filters: EmployeeFilterInput = {}) {
  const where: string[] = [];
  const params: any[] = [];
  if (filters.q) {
    const q = `%${filters.q.trim().toLowerCase()}%`;
    where.push(
      `(LOWER(e.first_name) LIKE ? OR LOWER(e.last_name) LIKE ? OR LOWER(e.email) LIKE ? OR LOWER(e.employee_number) LIKE ? OR LOWER(e.job_title) LIKE ?)`,
    );
    params.push(q, q, q, q, q);
  }
  if (filters.departmentId) {
    where.push(`e.department_id = ?`);
    params.push(filters.departmentId);
  }
  if (filters.role) {
    where.push(`e.employee_role = ?`);
    params.push(filters.role);
  }
  if (filters.status) {
    where.push(`e.status = ?`);
    params.push(filters.status);
  }
  if (filters.availabilityDate) {
    where.push(`EXISTS (
      SELECT 1 FROM employee_availability a
      WHERE a.employee_id = e.id
        AND (a.availability_date = ? OR (a.day_of_week IS NOT NULL AND a.day_of_week = CAST(strftime('%w', ?) AS INTEGER)))
    )`);
    params.push(filters.availabilityDate, filters.availabilityDate);
  }

  const sql = `
    SELECT
      e.*,
      d.name AS department_name,
      d.code AS department_code,
      (SELECT COUNT(*) FROM employee_schedules s WHERE s.employee_id = e.id) AS schedule_count,
      (SELECT COUNT(*) FROM employee_availability a WHERE a.employee_id = e.id) AS availability_count,
      (SELECT COUNT(*) FROM employee_activity_logs l WHERE l.employee_id = e.id) AS activity_count
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY e.updated_at DESC, e.created_at DESC
  `;
  return query.all(sql, params).map(attachEmployeeComputedFields);
}

export function getEmployee(id: string) {
  const row: any = query.get(
    `
    SELECT
      e.*,
      d.name AS department_name,
      d.code AS department_code
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    WHERE e.id = ?
  `,
    [id],
  );
  if (!row) return null;
  const schedules = query.all(
    `SELECT * FROM employee_schedules WHERE employee_id = ? ORDER BY schedule_date DESC, shift_start DESC`,
    [id],
  );
  const availability = query.all(
    `SELECT * FROM employee_availability WHERE employee_id = ? ORDER BY COALESCE(availability_date, '') DESC, day_of_week ASC`,
    [id],
  );
  const activity = query.all(
    `SELECT * FROM employee_activity_logs WHERE employee_id = ? ORDER BY created_at DESC`,
    [id],
  );
  return attachEmployeeComputedFields({
    ...row,
    schedules,
    availability,
    activity,
  });
}

export function updateEmployee(id: string, input: Partial<EmployeeInput>) {
  const current: any = query.get(`SELECT * FROM employees WHERE id = ?`, [id]);
  if (!current) throw new Error("Employee not found");
  const employeeNumber =
    input.employeeNumber === undefined
      ? current.employee_number
      : input.employeeNumber;
  const firstName =
    input.firstName === undefined ? current.first_name : input.firstName.trim();
  const lastName =
    input.lastName === undefined ? current.last_name : input.lastName.trim();
  const email =
    input.email === undefined ? current.email : normalizeText(input.email);
  const phone =
    input.phone === undefined ? current.phone : normalizeText(input.phone);
  const jobTitle =
    input.jobTitle === undefined
      ? current.job_title
      : normalizeText(input.jobTitle);
  const employeeRole =
    input.employeeRole === undefined
      ? current.employee_role
      : input.employeeRole.trim();
  const departmentId =
    input.departmentId === undefined
      ? current.department_id
      : input.departmentId;
  const employmentType =
    input.employmentType === undefined
      ? current.employment_type
      : input.employmentType;
  const status = input.status === undefined ? current.status : input.status;
  const permissionsJson =
    input.permissions === undefined
      ? current.permissions_json
      : JSON.stringify(input.permissions || []);
  const profileJson =
    input.profile === undefined
      ? current.profile_json
      : serialize(input.profile || {});
  const notes =
    input.notes === undefined ? current.notes : normalizeText(input.notes);
  const hiredAt =
    input.hiredAt === undefined ? current.hired_at : input.hiredAt;
  const managerEmployeeId =
    input.managerEmployeeId === undefined
      ? current.manager_employee_id
      : input.managerEmployeeId;

  query.run(
    `UPDATE employees SET
      employee_number = ?, first_name = ?, last_name = ?, email = ?, phone = ?, job_title = ?,
      employee_role = ?, department_id = ?, employment_type = ?, status = ?, permissions_json = ?,
      profile_json = ?, notes = ?, hired_at = ?, manager_employee_id = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [
      employeeNumber,
      firstName,
      lastName,
      email,
      phone,
      jobTitle,
      employeeRole,
      departmentId || null,
      employmentType,
      status,
      permissionsJson,
      profileJson,
      notes,
      hiredAt || null,
      managerEmployeeId || null,
      id,
    ],
  );
  logEmployeeActivity(id, "employee.update", { changes: input }, input.actor);
  return getEmployee(id);
}

export function deleteEmployee(id: string, actor?: string) {
  const employee = getEmployee(id);
  if (!employee) throw new Error("Employee not found");
  query.run(
    `UPDATE employees SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    ["INACTIVE", id],
  );
  logEmployeeActivity(
    id,
    "employee.delete",
    { employeeNumber: employee.employee_number },
    actor,
  );
  return getEmployee(id);
}

export function setEmployeePermissions(
  id: string,
  permissions: string[],
  actor?: string,
) {
  const employee: any = query.get(`SELECT * FROM employees WHERE id = ?`, [id]);
  if (!employee) throw new Error("Employee not found");
  query.run(
    `UPDATE employees SET permissions_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [JSON.stringify(permissions || []), id],
  );
  logEmployeeActivity(
    id,
    "employee.permissions.update",
    { permissions },
    actor,
  );
  return getEmployee(id);
}

export function addEmployeeSchedule(
  employeeId: string,
  input: {
    scheduleDate: string;
    shiftStart: string;
    shiftEnd: string;
    timezone?: string;
    status?: EmployeeScheduleStatus;
    location?: string;
    notes?: string;
  },
  actor?: string,
) {
  const employee: any = query.get(`SELECT * FROM employees WHERE id = ?`, [
    employeeId,
  ]);
  if (!employee) throw new Error("Employee not found");
  const id = makeId();
  query.run(
    `INSERT INTO employee_schedules (id, employee_id, schedule_date, shift_start, shift_end, timezone, status, location, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      employeeId,
      input.scheduleDate,
      input.shiftStart,
      input.shiftEnd,
      input.timezone || "Africa/Nairobi",
      input.status || "SCHEDULED",
      normalizeText(input.location),
      normalizeText(input.notes),
    ],
  );
  logEmployeeActivity(
    employeeId,
    "employee.schedule.create",
    { scheduleId: id, ...input },
    actor,
  );
  return query.get(`SELECT * FROM employee_schedules WHERE id = ?`, [id]);
}

export function listEmployeeSchedules(employeeId: string) {
  return query.all(
    `SELECT * FROM employee_schedules WHERE employee_id = ? ORDER BY schedule_date DESC, shift_start DESC`,
    [employeeId],
  );
}

export function addEmployeeAvailability(
  employeeId: string,
  input: {
    availabilityDate?: string | null;
    dayOfWeek?: number | null;
    availableFrom?: string | null;
    availableTo?: string | null;
    timezone?: string;
    status?: EmployeeAvailabilityStatus;
    notes?: string;
  },
  actor?: string,
) {
  const employee: any = query.get(`SELECT * FROM employees WHERE id = ?`, [
    employeeId,
  ]);
  if (!employee) throw new Error("Employee not found");
  const id = makeId();
  query.run(
    `INSERT INTO employee_availability (id, employee_id, availability_date, day_of_week, available_from, available_to, timezone, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      employeeId,
      input.availabilityDate || null,
      typeof input.dayOfWeek === "number" ? input.dayOfWeek : null,
      normalizeText(input.availableFrom),
      normalizeText(input.availableTo),
      input.timezone || "Africa/Nairobi",
      input.status || "AVAILABLE",
      normalizeText(input.notes),
    ],
  );
  logEmployeeActivity(
    employeeId,
    "employee.availability.create",
    { availabilityId: id, ...input },
    actor,
  );
  return query.get(`SELECT * FROM employee_availability WHERE id = ?`, [id]);
}

export function listEmployeeAvailability(employeeId: string) {
  return query.all(
    `SELECT * FROM employee_availability WHERE employee_id = ? ORDER BY COALESCE(availability_date, '') DESC, day_of_week ASC`,
    [employeeId],
  );
}

export function listEmployeeActivity(employeeId?: string) {
  if (employeeId) {
    return query.all(
      `SELECT * FROM employee_activity_logs WHERE employee_id = ? ORDER BY created_at DESC`,
      [employeeId],
    );
  }
  return query.all(
    `
      SELECT l.*, e.first_name, e.last_name, e.employee_number
      FROM employee_activity_logs l
      LEFT JOIN employees e ON e.id = l.employee_id
      ORDER BY l.created_at DESC
      LIMIT 250
    `,
  );
}

export function getEmployeeDashboard(employeeId?: string) {
  if (!employeeId) return null;
  return getEmployee(employeeId);
}

function attachEmployeeComputedFields(row: any) {
  return {
    ...row,
    permissions: parseJsonArray(row.permissions_json),
    profile: parseJsonObject(row.profile_json),
  };
}
