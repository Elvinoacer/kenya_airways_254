"use client";

import React, { useEffect, useMemo, useState } from "react";

type Department = {
  id: string;
  code: string;
  name: string;
  description: string | null;
};

type Employee = {
  id: string;
  user_id: string | null;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  employee_role: string;
  department_id: string | null;
  department_name?: string | null;
  department_code?: string | null;
  employment_type: string;
  status: string;
  permissions: string[];
  profile: Record<string, any>;
  notes: string | null;
  hired_at: string | null;
  manager_employee_id?: string | null;
  schedule_count?: number;
  availability_count?: number;
  activity_count?: number;
  schedules?: any[];
  availability?: any[];
  activity?: any[];
};

const emptyEmployeeForm = {
  userId: "",
  employeeNumber: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  jobTitle: "",
  employeeRole: "GROUND_STAFF",
  departmentId: "",
  employmentType: "FULL_TIME",
  status: "ACTIVE",
  permissionsText: "",
  profileJson: "{}",
  notes: "",
  hiredAt: "",
  managerEmployeeId: "",
};

const emptyDepartmentForm = {
  code: "",
  name: "",
  description: "",
  managerEmployeeId: "",
};

const emptyScheduleForm = {
  scheduleDate: "",
  shiftStart: "",
  shiftEnd: "",
  timezone: "Africa/Nairobi",
  status: "SCHEDULED",
  location: "",
  notes: "",
};

const emptyAvailabilityForm = {
  availabilityDate: "",
  dayOfWeek: "",
  availableFrom: "",
  availableTo: "",
  timezone: "Africa/Nairobi",
  status: "AVAILABLE",
  notes: "",
};

function toPermissionsText(permissions: string[]) {
  return permissions.join(", ");
}

function parsePermissionsText(value: string) {
  return value
    .split(",")
    .map((permission) => permission.trim())
    .filter(Boolean);
}

export default function EmployeeAdminPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({ ...emptyEmployeeForm });
  const [departmentForm, setDepartmentForm] = useState({
    ...emptyDepartmentForm,
  });
  const [scheduleForm, setScheduleForm] = useState({ ...emptyScheduleForm });
  const [availabilityForm, setAvailabilityForm] = useState({
    ...emptyAvailabilityForm,
  });
  const [filters, setFilters] = useState({
    q: "",
    departmentId: "",
    role: "",
    status: "",
    availabilityDate: "",
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.departmentId) params.set("departmentId", filters.departmentId);
    if (filters.role) params.set("role", filters.role);
    if (filters.status) params.set("status", filters.status);
    if (filters.availabilityDate)
      params.set("availabilityDate", filters.availabilityDate);
    return params.toString();
  }, [filters]);

  async function loadEmployees() {
    setLoading(true);
    const [employeeRes, departmentRes, activityRes] = await Promise.all([
      fetch(`/api/employees${queryString ? `?${queryString}` : ""}`),
      fetch("/api/employees/departments"),
      fetch("/api/employees/activity"),
    ]);
    const employeeData = employeeRes.ok
      ? await employeeRes.json()
      : { employees: [] };
    const departmentData = departmentRes.ok
      ? await departmentRes.json()
      : { departments: [] };
    const activityData = activityRes.ok
      ? await activityRes.json()
      : { activity: [] };
    setEmployees(employeeData.employees || []);
    setDepartments(departmentData.departments || []);
    setActivity(activityData.activity || []);
    setLoading(false);
  }

  async function loadEmployeeDetail(employeeId: string) {
    const res = await fetch(`/api/employees/${employeeId}`);
    if (!res.ok) return;
    const data = await res.json();
    setSelectedEmployee(data.employee || null);
  }

  useEffect(() => {
    loadEmployees();
  }, [queryString]);

  useEffect(() => {
    if (!selectedEmployee) return;
    setEmployeeForm({
      userId: selectedEmployee.user_id || "",
      employeeNumber: selectedEmployee.employee_number,
      firstName: selectedEmployee.first_name,
      lastName: selectedEmployee.last_name,
      email: selectedEmployee.email || "",
      phone: selectedEmployee.phone || "",
      jobTitle: selectedEmployee.job_title || "",
      employeeRole: selectedEmployee.employee_role,
      departmentId: selectedEmployee.department_id || "",
      employmentType: selectedEmployee.employment_type,
      status: selectedEmployee.status,
      permissionsText: toPermissionsText(selectedEmployee.permissions || []),
      profileJson: JSON.stringify(selectedEmployee.profile || {}, null, 2),
      notes: selectedEmployee.notes || "",
      hiredAt: selectedEmployee.hired_at || "",
      managerEmployeeId: selectedEmployee.manager_employee_id || "",
    });
  }, [selectedEmployee]);

  async function saveEmployee() {
    setSavingEmployee(true);
    const payload = {
      userId: employeeForm.userId || undefined,
      employeeNumber: employeeForm.employeeNumber || undefined,
      firstName: employeeForm.firstName,
      lastName: employeeForm.lastName,
      email: employeeForm.email || undefined,
      phone: employeeForm.phone || undefined,
      jobTitle: employeeForm.jobTitle || undefined,
      employeeRole: employeeForm.employeeRole,
      departmentId: employeeForm.departmentId || undefined,
      employmentType: employeeForm.employmentType,
      status: employeeForm.status,
      permissions: parsePermissionsText(employeeForm.permissionsText),
      profile: (() => {
        try {
          return JSON.parse(employeeForm.profileJson || "{}");
        } catch {
          return {};
        }
      })(),
      notes: employeeForm.notes || undefined,
      hiredAt: employeeForm.hiredAt || undefined,
      managerEmployeeId: employeeForm.managerEmployeeId || undefined,
      actor: "admin",
    };
    const url = selectedEmployee
      ? `/api/employees/${selectedEmployee.id}`
      : "/api/employees";
    const res = await fetch(url, {
      method: selectedEmployee ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      alert("Unable to save employee");
      setSavingEmployee(false);
      return;
    }
    const data = await res.json();
    setSelectedEmployee(data.employee || null);
    setEmployeeForm({ ...emptyEmployeeForm });
    await loadEmployees();
    setSavingEmployee(false);
  }

  async function deleteEmployee(employeeId: string) {
    if (!confirm("Delete this employee profile?")) return;
    const res = await fetch(`/api/employees/${employeeId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      alert("Delete failed");
      return;
    }
    setSelectedEmployee(null);
    setEmployeeForm({ ...emptyEmployeeForm });
    await loadEmployees();
  }

  async function saveDepartment() {
    setSavingDepartment(true);
    const res = await fetch("/api/employees/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: departmentForm.code || undefined,
        name: departmentForm.name,
        description: departmentForm.description || undefined,
        managerEmployeeId: departmentForm.managerEmployeeId || undefined,
        actor: "admin",
      }),
    });
    if (!res.ok) {
      alert("Unable to create department");
      setSavingDepartment(false);
      return;
    }
    setDepartmentForm({ ...emptyDepartmentForm });
    await loadEmployees();
    setSavingDepartment(false);
  }

  async function deleteDepartment(id: string) {
    if (!confirm("Delete this department?")) return;
    const res = await fetch(`/api/employees/departments/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      alert("Delete failed");
      return;
    }
    await loadEmployees();
  }

  async function addSchedule() {
    if (!selectedEmployee) return;
    setSavingSchedule(true);
    const res = await fetch(`/api/employees/${selectedEmployee.id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...scheduleForm, actor: "admin" }),
    });
    if (!res.ok) {
      alert("Unable to add schedule");
      setSavingSchedule(false);
      return;
    }
    setScheduleForm({ ...emptyScheduleForm });
    await loadEmployeeDetail(selectedEmployee.id);
    await loadEmployees();
    setSavingSchedule(false);
  }

  async function addAvailability() {
    if (!selectedEmployee) return;
    setSavingAvailability(true);
    const res = await fetch(
      `/api/employees/${selectedEmployee.id}/availability`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...availabilityForm,
          dayOfWeek:
            availabilityForm.dayOfWeek === ""
              ? undefined
              : Number(availabilityForm.dayOfWeek),
          actor: "admin",
        }),
      },
    );
    if (!res.ok) {
      alert("Unable to add availability");
      setSavingAvailability(false);
      return;
    }
    setAvailabilityForm({ ...emptyAvailabilityForm });
    await loadEmployeeDetail(selectedEmployee.id);
    await loadEmployees();
    setSavingAvailability(false);
  }

  async function updatePermissions() {
    if (!selectedEmployee) return;
    const permissions = parsePermissionsText(employeeForm.permissionsText);
    const res = await fetch(`/api/employees/${selectedEmployee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions, actor: "admin" }),
    });
    if (!res.ok) {
      alert("Unable to update permissions");
      return;
    }
    await loadEmployeeDetail(selectedEmployee.id);
    await loadEmployees();
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Employee Management</h1>
        <p className="text-sm text-gray-600">
          Manage staff profiles, departments, scheduling, availability,
          permissions, and activity logs.
        </p>
      </div>

      <section className="grid gap-3 rounded border p-4 md:grid-cols-5">
        <input
          className="rounded border p-2"
          placeholder="Search employees"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <select
          className="rounded border p-2"
          value={filters.departmentId}
          onChange={(e) =>
            setFilters({ ...filters, departmentId: e.target.value })
          }
        >
          <option value="">All departments</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <select
          className="rounded border p-2"
          value={filters.role}
          onChange={(e) => setFilters({ ...filters, role: e.target.value })}
        >
          <option value="">All roles</option>
          <option value="GROUND_STAFF">Ground Staff</option>
          <option value="CABIN_CREW">Cabin Crew</option>
          <option value="PILOT">Pilot</option>
          <option value="OPERATIONS">Operations</option>
          <option value="CUSTOMER_SERVICE">Customer Service</option>
          <option value="MANAGER">Manager</option>
        </select>
        <select
          className="rounded border p-2"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_LEAVE">On leave</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <input
          className="rounded border p-2"
          type="date"
          value={filters.availabilityDate}
          onChange={(e) =>
            setFilters({ ...filters, availabilityDate: e.target.value })
          }
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded border p-4">
            <h2 className="font-medium">
              {selectedEmployee ? "Edit employee" : "Create employee"}
            </h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <input
                className="rounded border p-2"
                placeholder="Employee number"
                value={employeeForm.employeeNumber}
                onChange={(e) =>
                  setEmployeeForm({
                    ...employeeForm,
                    employeeNumber: e.target.value,
                  })
                }
              />
              <input
                className="rounded border p-2"
                placeholder="User ID (optional)"
                value={employeeForm.userId}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, userId: e.target.value })
                }
              />
              <input
                className="rounded border p-2"
                placeholder="First name"
                value={employeeForm.firstName}
                onChange={(e) =>
                  setEmployeeForm({
                    ...employeeForm,
                    firstName: e.target.value,
                  })
                }
              />
              <input
                className="rounded border p-2"
                placeholder="Last name"
                value={employeeForm.lastName}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, lastName: e.target.value })
                }
              />
              <input
                className="rounded border p-2"
                placeholder="Email"
                value={employeeForm.email}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, email: e.target.value })
                }
              />
              <input
                className="rounded border p-2"
                placeholder="Phone"
                value={employeeForm.phone}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, phone: e.target.value })
                }
              />
              <input
                className="rounded border p-2"
                placeholder="Job title"
                value={employeeForm.jobTitle}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, jobTitle: e.target.value })
                }
              />
              <select
                className="rounded border p-2"
                value={employeeForm.employeeRole}
                onChange={(e) =>
                  setEmployeeForm({
                    ...employeeForm,
                    employeeRole: e.target.value,
                  })
                }
              >
                <option value="GROUND_STAFF">Ground Staff</option>
                <option value="CABIN_CREW">Cabin Crew</option>
                <option value="PILOT">Pilot</option>
                <option value="OPERATIONS">Operations</option>
                <option value="CUSTOMER_SERVICE">Customer Service</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
              <select
                className="rounded border p-2"
                value={employeeForm.departmentId}
                onChange={(e) =>
                  setEmployeeForm({
                    ...employeeForm,
                    departmentId: e.target.value,
                  })
                }
              >
                <option value="">No department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded border p-2"
                value={employeeForm.employmentType}
                onChange={(e) =>
                  setEmployeeForm({
                    ...employeeForm,
                    employmentType: e.target.value,
                  })
                }
              >
                <option value="FULL_TIME">Full time</option>
                <option value="PART_TIME">Part time</option>
                <option value="CONTRACT">Contract</option>
                <option value="TEMPORARY">Temporary</option>
              </select>
              <select
                className="rounded border p-2"
                value={employeeForm.status}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, status: e.target.value })
                }
              >
                <option value="ACTIVE">Active</option>
                <option value="ON_LEAVE">On leave</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <input
                className="rounded border p-2"
                placeholder="Hired at (ISO)"
                value={employeeForm.hiredAt}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, hiredAt: e.target.value })
                }
              />
              <input
                className="rounded border p-2"
                placeholder="Manager employee ID"
                value={employeeForm.managerEmployeeId}
                onChange={(e) =>
                  setEmployeeForm({
                    ...employeeForm,
                    managerEmployeeId: e.target.value,
                  })
                }
              />
              <textarea
                className="rounded border p-2 md:col-span-2"
                rows={3}
                placeholder="Permissions, comma separated"
                value={employeeForm.permissionsText}
                onChange={(e) =>
                  setEmployeeForm({
                    ...employeeForm,
                    permissionsText: e.target.value,
                  })
                }
              />
              <textarea
                className="rounded border p-2 md:col-span-2"
                rows={4}
                placeholder="Profile JSON"
                value={employeeForm.profileJson}
                onChange={(e) =>
                  setEmployeeForm({
                    ...employeeForm,
                    profileJson: e.target.value,
                  })
                }
              />
              <textarea
                className="rounded border p-2 md:col-span-2"
                rows={3}
                placeholder="Notes"
                value={employeeForm.notes}
                onChange={(e) =>
                  setEmployeeForm({ ...employeeForm, notes: e.target.value })
                }
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="rounded bg-black px-4 py-2 text-white"
                onClick={saveEmployee}
                disabled={savingEmployee}
              >
                {savingEmployee
                  ? "Saving..."
                  : selectedEmployee
                    ? "Save employee"
                    : "Create employee"}
              </button>
              {selectedEmployee ? (
                <button
                  className="rounded border px-4 py-2"
                  onClick={() => {
                    setSelectedEmployee(null);
                    setEmployeeForm({ ...emptyEmployeeForm });
                  }}
                >
                  New employee
                </button>
              ) : null}
            </div>
          </div>

          <div className="rounded border p-4">
            <h2 className="font-medium">Employees</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="p-2">Employee</th>
                    <th className="p-2">Department</th>
                    <th className="p-2">Role</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Schedule</th>
                    <th className="p-2">Availability</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td className="p-3" colSpan={7}>
                        Loading...
                      </td>
                    </tr>
                  ) : employees.length === 0 ? (
                    <tr>
                      <td className="p-3" colSpan={7}>
                        No employees found
                      </td>
                    </tr>
                  ) : (
                    employees.map((employee) => (
                      <tr key={employee.id} className="border-t">
                        <td className="p-2">
                          <div className="font-medium">
                            {employee.first_name} {employee.last_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {employee.employee_number}{" "}
                            {employee.email ? `• ${employee.email}` : ""}
                          </div>
                        </td>
                        <td className="p-2">
                          {employee.department_name || "—"}
                        </td>
                        <td className="p-2">{employee.employee_role}</td>
                        <td className="p-2">{employee.status}</td>
                        <td className="p-2">{employee.schedule_count || 0}</td>
                        <td className="p-2">
                          {employee.availability_count || 0}
                        </td>
                        <td className="p-2 space-x-2">
                          <button
                            className="rounded border px-2 py-1"
                            onClick={async () => {
                              setSelectedEmployee(employee);
                              await loadEmployeeDetail(employee.id);
                            }}
                          >
                            View
                          </button>
                          <button
                            className="rounded border px-2 py-1"
                            onClick={async () => {
                              setSelectedEmployee(employee);
                              await loadEmployeeDetail(employee.id);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="rounded border px-2 py-1"
                            onClick={() => deleteEmployee(employee.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded border p-4">
            <h2 className="font-medium">Departments</h2>
            <div className="mt-3 grid gap-2">
              <input
                className="rounded border p-2"
                placeholder="Code"
                value={departmentForm.code}
                onChange={(e) =>
                  setDepartmentForm({ ...departmentForm, code: e.target.value })
                }
              />
              <input
                className="rounded border p-2"
                placeholder="Name"
                value={departmentForm.name}
                onChange={(e) =>
                  setDepartmentForm({ ...departmentForm, name: e.target.value })
                }
              />
              <input
                className="rounded border p-2"
                placeholder="Description"
                value={departmentForm.description}
                onChange={(e) =>
                  setDepartmentForm({
                    ...departmentForm,
                    description: e.target.value,
                  })
                }
              />
              <input
                className="rounded border p-2"
                placeholder="Manager employee ID"
                value={departmentForm.managerEmployeeId}
                onChange={(e) =>
                  setDepartmentForm({
                    ...departmentForm,
                    managerEmployeeId: e.target.value,
                  })
                }
              />
              <button
                className="rounded bg-black px-4 py-2 text-white"
                onClick={saveDepartment}
                disabled={savingDepartment}
              >
                {savingDepartment ? "Saving..." : "Create department"}
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {departments.map((department) => (
                <div key={department.id} className="rounded border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{department.name}</div>
                      <div className="text-xs text-gray-500">
                        {department.code}
                      </div>
                      <div className="text-sm text-gray-600">
                        {department.description || "No description"}
                      </div>
                    </div>
                    <button
                      className="rounded border px-2 py-1 text-sm"
                      onClick={() => deleteDepartment(department.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedEmployee ? (
            <div className="rounded border p-4 space-y-4">
              <div>
                <h2 className="font-medium">Employee Detail</h2>
                <p className="text-sm text-gray-600">
                  {selectedEmployee.first_name} {selectedEmployee.last_name} •{" "}
                  {selectedEmployee.employee_number}
                </p>
              </div>

              <div className="rounded border p-3">
                <div className="mb-2 font-medium">Permissions</div>
                <textarea
                  className="w-full rounded border p-2"
                  rows={3}
                  value={employeeForm.permissionsText}
                  onChange={(e) =>
                    setEmployeeForm({
                      ...employeeForm,
                      permissionsText: e.target.value,
                    })
                  }
                />
                <button
                  className="mt-2 rounded border px-3 py-2"
                  onClick={updatePermissions}
                >
                  Update permissions
                </button>
              </div>

              <div className="rounded border p-3">
                <div className="mb-2 font-medium">Staff scheduling</div>
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    className="rounded border p-2"
                    type="date"
                    value={scheduleForm.scheduleDate}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        scheduleDate: e.target.value,
                      })
                    }
                  />
                  <input
                    className="rounded border p-2"
                    type="time"
                    value={scheduleForm.shiftStart}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        shiftStart: e.target.value,
                      })
                    }
                  />
                  <input
                    className="rounded border p-2"
                    type="time"
                    value={scheduleForm.shiftEnd}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        shiftEnd: e.target.value,
                      })
                    }
                  />
                  <input
                    className="rounded border p-2"
                    placeholder="Timezone"
                    value={scheduleForm.timezone}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        timezone: e.target.value,
                      })
                    }
                  />
                  <input
                    className="rounded border p-2"
                    placeholder="Location"
                    value={scheduleForm.location}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        location: e.target.value,
                      })
                    }
                  />
                  <select
                    className="rounded border p-2"
                    value={scheduleForm.status}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        status: e.target.value,
                      })
                    }
                  >
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="NO_SHOW">No show</option>
                  </select>
                  <textarea
                    className="rounded border p-2 md:col-span-2"
                    rows={2}
                    placeholder="Notes"
                    value={scheduleForm.notes}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        notes: e.target.value,
                      })
                    }
                  />
                </div>
                <button
                  className="mt-2 rounded border px-3 py-2"
                  onClick={addSchedule}
                  disabled={savingSchedule}
                >
                  {savingSchedule ? "Adding..." : "Add schedule"}
                </button>
                <div className="mt-3 space-y-2 text-sm">
                  {(selectedEmployee.schedules || []).map((schedule) => (
                    <div key={schedule.id} className="rounded bg-gray-50 p-2">
                      {schedule.schedule_date} {schedule.shift_start}-
                      {schedule.shift_end} • {schedule.status}{" "}
                      {schedule.location ? `• ${schedule.location}` : ""}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded border p-3">
                <div className="mb-2 font-medium">Availability tracking</div>
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    className="rounded border p-2"
                    type="date"
                    value={availabilityForm.availabilityDate}
                    onChange={(e) =>
                      setAvailabilityForm({
                        ...availabilityForm,
                        availabilityDate: e.target.value,
                      })
                    }
                  />
                  <input
                    className="rounded border p-2"
                    type="number"
                    min={0}
                    max={6}
                    placeholder="Day of week (0-6)"
                    value={availabilityForm.dayOfWeek}
                    onChange={(e) =>
                      setAvailabilityForm({
                        ...availabilityForm,
                        dayOfWeek: e.target.value,
                      })
                    }
                  />
                  <input
                    className="rounded border p-2"
                    type="time"
                    value={availabilityForm.availableFrom}
                    onChange={(e) =>
                      setAvailabilityForm({
                        ...availabilityForm,
                        availableFrom: e.target.value,
                      })
                    }
                  />
                  <input
                    className="rounded border p-2"
                    type="time"
                    value={availabilityForm.availableTo}
                    onChange={(e) =>
                      setAvailabilityForm({
                        ...availabilityForm,
                        availableTo: e.target.value,
                      })
                    }
                  />
                  <input
                    className="rounded border p-2"
                    placeholder="Timezone"
                    value={availabilityForm.timezone}
                    onChange={(e) =>
                      setAvailabilityForm({
                        ...availabilityForm,
                        timezone: e.target.value,
                      })
                    }
                  />
                  <select
                    className="rounded border p-2"
                    value={availabilityForm.status}
                    onChange={(e) =>
                      setAvailabilityForm({
                        ...availabilityForm,
                        status: e.target.value,
                      })
                    }
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="LIMITED">Limited</option>
                    <option value="UNAVAILABLE">Unavailable</option>
                  </select>
                  <textarea
                    className="rounded border p-2 md:col-span-2"
                    rows={2}
                    placeholder="Notes"
                    value={availabilityForm.notes}
                    onChange={(e) =>
                      setAvailabilityForm({
                        ...availabilityForm,
                        notes: e.target.value,
                      })
                    }
                  />
                </div>
                <button
                  className="mt-2 rounded border px-3 py-2"
                  onClick={addAvailability}
                  disabled={savingAvailability}
                >
                  {savingAvailability ? "Adding..." : "Add availability"}
                </button>
                <div className="mt-3 space-y-2 text-sm">
                  {(selectedEmployee.availability || []).map((entry) => (
                    <div key={entry.id} className="rounded bg-gray-50 p-2">
                      {entry.availability_date || `Day ${entry.day_of_week}`}{" "}
                      {entry.available_from
                        ? `${entry.available_from}-${entry.available_to || ""}`
                        : ""}{" "}
                      • {entry.status}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded border p-3">
                <div className="mb-2 font-medium">Employee activity logs</div>
                <div className="space-y-2 text-sm">
                  {(selectedEmployee.activity || [])
                    .slice(0, 10)
                    .map((entry) => (
                      <div key={entry.id} className="rounded bg-gray-50 p-2">
                        <div className="font-medium">{entry.action}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(entry.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="rounded border p-3">
                <div className="mb-2 font-medium">
                  Employee permissions summary
                </div>
                <div className="text-sm text-gray-700">
                  {(selectedEmployee.permissions || []).length > 0
                    ? selectedEmployee.permissions.join(", ")
                    : "No permissions assigned"}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded border p-4 text-sm text-gray-600">
              Select an employee to manage schedules, availability, permissions,
              and activity history.
            </div>
          )}
        </div>
      </section>

      <section className="rounded border p-4">
        <h2 className="font-medium">Employee activity feed</h2>
        <div className="mt-3 space-y-2 text-sm">
          {activity.length === 0 ? (
            <div>No activity recorded yet.</div>
          ) : (
            activity.slice(0, 20).map((entry) => (
              <div key={entry.id} className="rounded bg-gray-50 p-3">
                <div className="font-medium">{entry.action}</div>
                <div className="text-xs text-gray-500">
                  {entry.first_name
                    ? `${entry.first_name} ${entry.last_name} (${entry.employee_number})`
                    : entry.employee_id}{" "}
                  • {new Date(entry.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
