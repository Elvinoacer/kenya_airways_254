import { prisma } from "./prisma";

export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "SUSPENDED" | "INACTIVE";
export type EmployeeScheduleStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type EmployeeAvailabilityStatus = "AVAILABLE" | "UNAVAILABLE" | "LIMITED";

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

function parseJsonObject<T extends Record<string, any>>(value: string | null): T {
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

async function logEmployeeActivity(employeeId: string, action: string, details?: Record<string, any>, actor?: string) {
  await prisma.employeeActivityLog.create({
    data: {
      employeeId,
      action,
      detailsJson: JSON.stringify(details || {}),
      actor: actor || null,
    },
  });
}

export async function listDepartments() {
  return prisma.department.findMany({ orderBy: { name: "asc" } });
}

export async function getDepartment(id: string) {
  return prisma.department.findUnique({ where: { id } });
}

export async function createDepartment(input: DepartmentInput) {
  const code =
    (input.code || input.name)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20) || `DEP-${Date.now().toString().slice(0, 8).toUpperCase()}`;

  const department = await prisma.department.create({
    data: {
      code,
      name: input.name.trim(),
      description: normalizeText(input.description),
      managerEmployeeId: input.managerEmployeeId || null,
    },
  });
  return department;
}

export async function updateDepartment(id: string, input: Partial<DepartmentInput>) {
  const current = await getDepartment(id);
  if (!current) throw new Error("Department not found");

  const department = await prisma.department.update({
    where: { id },
    data: {
      code: input.code === undefined ? current.code : input.code || current.code,
      name: input.name === undefined ? current.name : input.name.trim(),
      description: input.description === undefined ? current.description : normalizeText(input.description),
      managerEmployeeId: input.managerEmployeeId === undefined ? current.managerEmployeeId : input.managerEmployeeId,
    },
  });
  return department;
}

export async function deleteDepartment(id: string) {
  const department = await getDepartment(id);
  if (!department) throw new Error("Department not found");

  await prisma.employee.updateMany({
    where: { departmentId: id },
    data: { departmentId: null },
  });

  await prisma.department.delete({ where: { id } });
  return department;
}

export async function createEmployee(input: EmployeeInput) {
  const employeeNumber = input.employeeNumber || makeEmployeeNumber();

  const employee = await prisma.employee.create({
    data: {
      userId: input.userId || null,
      employeeNumber,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: normalizeText(input.email),
      phone: normalizeText(input.phone),
      jobTitle: normalizeText(input.jobTitle),
      employeeRole: input.employeeRole.trim(),
      departmentId: input.departmentId || null,
      employmentType: input.employmentType || "FULL_TIME",
      status: input.status || "ACTIVE",
      permissionsJson: JSON.stringify(input.permissions || []),
      profileJson: serialize(input.profile || {}),
      notes: normalizeText(input.notes),
      hiredAt: input.hiredAt || null,
      managerEmployeeId: input.managerEmployeeId || null,
    },
  });

  await logEmployeeActivity(
    employee.id,
    "employee.create",
    {
      employeeNumber,
      employeeRole: input.employeeRole,
      departmentId: input.departmentId || null,
    },
    input.actor,
  );

  return getEmployee(employee.id);
}

export async function listEmployees(filters: EmployeeFilterInput = {}) {
  const where: any = {};

  if (filters.q) {
    const q = filters.q.trim().toLowerCase();
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { employeeNumber: { contains: q, mode: "insensitive" } },
      { jobTitle: { contains: q, mode: "insensitive" } },
    ];
  }

  if (filters.departmentId) {
    where.departmentId = filters.departmentId;
  }

  if (filters.role) {
    where.employeeRole = filters.role;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.availabilityDate) {
    where.availability = {
      some: {
        OR: [
          { availabilityDate: filters.availabilityDate },
          { dayOfWeek: new Date(filters.availabilityDate).getDay() },
        ],
      },
    };
  }

  const employees = await prisma.employee.findMany({
    where,
    include: {
      department: true,
      _count: {
        select: { schedules: true, availability: true, activityLogs: true },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return employees.map((e: any) => ({
    ...e,
    department_name: e.department?.name,
    department_code: e.department?.code,
    schedule_count: e._count.schedules,
    availability_count: e._count.availability,
    activity_count: e._count.activityLogs,
    ...attachEmployeeComputedFields(e),
  }));
}

export async function getEmployee(id: string) {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      department: true,
      schedules: {
        orderBy: [{ scheduleDate: "desc" }, { shiftStart: "desc" }],
      },
      availability: {
        orderBy: [{ availabilityDate: "desc" }, { dayOfWeek: "asc" }],
      },
      activityLogs: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!employee) return null;

  return {
    ...employee,
    department_name: employee.department?.name,
    department_code: employee.department?.code,
    activity: employee.activityLogs,
    ...attachEmployeeComputedFields(employee),
  };
}

export async function updateEmployee(id: string, input: Partial<EmployeeInput>) {
  const current = await prisma.employee.findUnique({ where: { id } });
  if (!current) throw new Error("Employee not found");

  await prisma.employee.update({
    where: { id },
    data: {
      employeeNumber: input.employeeNumber === undefined ? current.employeeNumber : input.employeeNumber,
      firstName: input.firstName === undefined ? current.firstName : input.firstName.trim(),
      lastName: input.lastName === undefined ? current.lastName : input.lastName.trim(),
      email: input.email === undefined ? current.email : normalizeText(input.email),
      phone: input.phone === undefined ? current.phone : normalizeText(input.phone),
      jobTitle: input.jobTitle === undefined ? current.jobTitle : normalizeText(input.jobTitle),
      employeeRole: input.employeeRole === undefined ? current.employeeRole : input.employeeRole.trim(),
      departmentId: input.departmentId === undefined ? current.departmentId : input.departmentId,
      employmentType: input.employmentType === undefined ? current.employmentType : input.employmentType,
      status: input.status === undefined ? current.status : input.status,
      permissionsJson:
        input.permissions === undefined ? current.permissionsJson : JSON.stringify(input.permissions || []),
      profileJson: input.profile === undefined ? current.profileJson : serialize(input.profile || {}),
      notes: input.notes === undefined ? current.notes : normalizeText(input.notes),
      hiredAt: input.hiredAt === undefined ? current.hiredAt : input.hiredAt,
      managerEmployeeId: input.managerEmployeeId === undefined ? current.managerEmployeeId : input.managerEmployeeId,
    },
  });

  await logEmployeeActivity(id, "employee.update", { changes: input }, input.actor);
  return getEmployee(id);
}

export async function deleteEmployee(id: string, actor?: string) {
  const employee = await getEmployee(id);
  if (!employee) throw new Error("Employee not found");

  await prisma.employee.update({
    where: { id },
    data: { status: "INACTIVE" },
  });

  await logEmployeeActivity(id, "employee.delete", { employeeNumber: employee.employeeNumber }, actor);
  return getEmployee(id);
}

export async function setEmployeePermissions(id: string, permissions: string[], actor?: string) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) throw new Error("Employee not found");

  await prisma.employee.update({
    where: { id },
    data: { permissionsJson: JSON.stringify(permissions || []) },
  });

  await logEmployeeActivity(id, "employee.permissions.update", { permissions }, actor);
  return getEmployee(id);
}

export async function addEmployeeSchedule(
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
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new Error("Employee not found");

  const schedule = await prisma.employeeSchedule.create({
    data: {
      employeeId,
      scheduleDate: input.scheduleDate,
      shiftStart: input.shiftStart,
      shiftEnd: input.shiftEnd,
      timezone: input.timezone || "Africa/Nairobi",
      status: input.status || "SCHEDULED",
      location: normalizeText(input.location),
      notes: normalizeText(input.notes),
    },
  });

  await logEmployeeActivity(employeeId, "employee.schedule.create", { scheduleId: schedule.id, ...input }, actor);
  return schedule;
}

export async function listEmployeeSchedules(employeeId: string) {
  return prisma.employeeSchedule.findMany({
    where: { employeeId },
    orderBy: [{ scheduleDate: "desc" }, { shiftStart: "desc" }],
  });
}

export async function addEmployeeAvailability(
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
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new Error("Employee not found");

  const availability = await prisma.employeeAvailability.create({
    data: {
      employeeId,
      availabilityDate: input.availabilityDate || null,
      dayOfWeek: typeof input.dayOfWeek === "number" ? input.dayOfWeek : null,
      availableFrom: normalizeText(input.availableFrom),
      availableTo: normalizeText(input.availableTo),
      timezone: input.timezone || "Africa/Nairobi",
      status: input.status || "AVAILABLE",
      notes: normalizeText(input.notes),
    },
  });

  await logEmployeeActivity(
    employeeId,
    "employee.availability.create",
    { availabilityId: availability.id, ...input },
    actor,
  );
  return availability;
}

export async function listEmployeeAvailability(employeeId: string) {
  return prisma.employeeAvailability.findMany({
    where: { employeeId },
    orderBy: [{ availabilityDate: "desc" }, { dayOfWeek: "asc" }],
  });
}

export async function listEmployeeActivity(employeeId?: string) {
  if (employeeId) {
    return prisma.employeeActivityLog.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });
  }

  return prisma.employeeActivityLog
    .findMany({
      include: {
        employee: {
          select: { firstName: true, lastName: true, employeeNumber: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 250,
    })
    .then((logs: any[]) =>
      logs.map((l: any) => ({
        ...l,
        first_name: l.employee.firstName,
        last_name: l.employee.lastName,
        employee_number: l.employee.employeeNumber,
      })),
    );
}

export async function getEmployeeDashboard(employeeId?: string) {
  if (!employeeId) return null;
  return getEmployee(employeeId);
}

function attachEmployeeComputedFields(row: any) {
  return {
    permissions: parseJsonArray(row.permissionsJson),
    profile: parseJsonObject(row.profileJson),
  };
}
