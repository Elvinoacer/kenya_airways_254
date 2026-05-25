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
    <div className="text-[#1A1A1A]">
      <header className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-6 lg:px-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
              Staff Operations
            </div>
            <h1 className="text-3xl font-black text-[#1A1A1A]">
              Employee Management
            </h1>
            <p className="text-sm text-[#5e3f3c] mt-2 max-w-2xl">
              Manage staff profiles, departments, scheduling, availability,
              permissions, and activity logs.
            </p>
          </div>
        </div>
      </header>

      <main className="p-6 lg:p-8 space-y-8 max-w-[1600px]">
        {/* Filters */}
        <section className="bg-white rounded-2xl border border-[#e5e2e1] p-4 flex flex-wrap gap-4 items-center shadow-sm">
          <div className="flex-1 min-w-[200px] relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5e3f3c]">search</span>
            <input
              className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium"
              placeholder="Search employees"
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            />
          </div>
          <div className="w-full md:w-auto">
            <select
              className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium"
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
          </div>
          <div className="w-full md:w-auto">
            <select
              className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium"
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
          </div>
          <div className="w-full md:w-auto">
            <select
              className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_LEAVE">On leave</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div className="w-full md:w-auto flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-[#5e3f3c]">Available On:</span>
            <input
              className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium"
              type="date"
              value={filters.availabilityDate}
              onChange={(e) =>
                setFilters({ ...filters, availabilityDate: e.target.value })
              }
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            
            {/* Create/Edit Employee */}
            <div className="bg-white rounded-3xl border border-[#e5e2e1] p-6 lg:p-8 shadow-[0_8px_32px_rgba(13,13,13,0.06)]">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#e5e2e1]">
                <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">badge</span>
                  {selectedEmployee ? "Edit Employee Profile" : "Create New Employee"}
                </h2>
                {selectedEmployee && (
                  <button
                    className="bg-[#fcf9f8] border border-[#e5e2e1] hover:bg-white text-[#1A1A1A] text-xs font-bold rounded-lg px-3 py-1.5 transition-colors shadow-sm flex items-center gap-1"
                    onClick={() => {
                      setSelectedEmployee(null);
                      setEmployeeForm({ ...emptyEmployeeForm });
                    }}
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                    Clear Selection
                  </button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Employee Number</label>
                  <input
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                    placeholder="e.g. EMP-001"
                    value={employeeForm.employeeNumber}
                    onChange={(e) =>
                      setEmployeeForm({
                        ...employeeForm,
                        employeeNumber: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">User ID (Optional)</label>
                  <input
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                    placeholder="Auth User ID"
                    value={employeeForm.userId}
                    onChange={(e) =>
                      setEmployeeForm({ ...employeeForm, userId: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">First Name</label>
                  <input
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                    placeholder="First name"
                    value={employeeForm.firstName}
                    onChange={(e) =>
                      setEmployeeForm({
                        ...employeeForm,
                        firstName: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Last Name</label>
                  <input
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                    placeholder="Last name"
                    value={employeeForm.lastName}
                    onChange={(e) =>
                      setEmployeeForm({ ...employeeForm, lastName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Email</label>
                  <input
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                    placeholder="Email address"
                    value={employeeForm.email}
                    onChange={(e) =>
                      setEmployeeForm({ ...employeeForm, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Phone</label>
                  <input
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                    placeholder="Phone number"
                    value={employeeForm.phone}
                    onChange={(e) =>
                      setEmployeeForm({ ...employeeForm, phone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Job Title</label>
                  <input
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                    placeholder="e.g. Senior Pilot"
                    value={employeeForm.jobTitle}
                    onChange={(e) =>
                      setEmployeeForm({ ...employeeForm, jobTitle: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">System Role</label>
                  <select
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
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
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Department</label>
                  <select
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
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
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Employment Type</label>
                  <select
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
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
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Status</label>
                  <select
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
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
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Hired At (ISO)</label>
                  <input
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                    placeholder="YYYY-MM-DD"
                    value={employeeForm.hiredAt}
                    onChange={(e) =>
                      setEmployeeForm({ ...employeeForm, hiredAt: e.target.value })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Manager Employee ID</label>
                  <input
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                    placeholder="e.g. EMP-005"
                    value={employeeForm.managerEmployeeId}
                    onChange={(e) =>
                      setEmployeeForm({
                        ...employeeForm,
                        managerEmployeeId: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Permissions</label>
                  <textarea
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                    rows={2}
                    placeholder="Comma separated permissions"
                    value={employeeForm.permissionsText}
                    onChange={(e) =>
                      setEmployeeForm({
                        ...employeeForm,
                        permissionsText: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Profile JSON</label>
                  <textarea
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-mono text-[11px]"
                    rows={4}
                    placeholder="{}"
                    value={employeeForm.profileJson}
                    onChange={(e) =>
                      setEmployeeForm({
                        ...employeeForm,
                        profileJson: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Notes</label>
                  <textarea
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                    rows={3}
                    placeholder="Additional context or notes..."
                    value={employeeForm.notes}
                    onChange={(e) =>
                      setEmployeeForm({ ...employeeForm, notes: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-[#e5e2e1]">
                <button
                  className="bg-primary hover:bg-[#e71520] text-white font-bold rounded-xl px-8 py-3 transition-colors shadow-[0_4px_12px_rgba(231,21,32,0.2)] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  onClick={saveEmployee}
                  disabled={savingEmployee}
                >
                  {savingEmployee ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : selectedEmployee ? (
                    <>
                      <span className="material-symbols-outlined text-[20px]">save</span>
                      Save Changes
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">person_add</span>
                      Create Employee
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Employee List Table */}
            <div className="bg-white rounded-3xl border border-[#e5e2e1] shadow-[0_8px_32px_rgba(13,13,13,0.06)] overflow-hidden">
              <div className="p-6 border-b border-[#e5e2e1] bg-[#fcf9f8] flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#5e3f3c]">groups</span>
                  Staff Directory
                </h2>
                <span className="text-xs font-bold text-[#5e3f3c] bg-white px-3 py-1.5 rounded-lg border border-[#e5e2e1]">
                  {employees.length} entries
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white text-left text-[11px] font-bold uppercase tracking-widest text-[#5e3f3c] border-b border-[#e5e2e1]">
                    <tr>
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Department & Role</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Activity</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e2e1] bg-white">
                    {loading ? (
                      <tr>
                        <td className="px-6 py-12 text-center" colSpan={5}>
                          <div className="flex justify-center">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        </td>
                      </tr>
                    ) : employees.length === 0 ? (
                      <tr>
                        <td className="px-6 py-12 text-center text-[#5e3f3c]" colSpan={5}>
                          No employees match the current filters.
                        </td>
                      </tr>
                    ) : (
                      employees.map((employee) => (
                        <tr key={employee.id} className={`hover:bg-[#fcf9f8] transition-colors group ${selectedEmployee?.id === employee.id ? "bg-[#fcf9f8] border-l-4 border-l-primary" : "border-l-4 border-l-transparent"}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                                {employee.first_name[0]}{employee.last_name[0]}
                              </div>
                              <div>
                                <div className="font-bold text-[#1A1A1A]">
                                  {employee.first_name} {employee.last_name}
                                </div>
                                <div className="text-xs text-[#5e3f3c] font-mono mt-0.5">
                                  {employee.employee_number}
                                </div>
                                {employee.email && (
                                  <div className="text-[10px] text-[#5e3f3c] mt-0.5">{employee.email}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-[#1A1A1A]">
                              {employee.employee_role}
                            </div>
                            <div className="text-xs text-[#5e3f3c] mt-0.5">
                              {employee.department_name || "No Department"}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${
                              employee.status === "ACTIVE" ? "bg-green-50 text-green-700 border-green-200" :
                              employee.status === "ON_LEAVE" ? "bg-amber-50 text-amber-700 border-amber-200" :
                              "bg-slate-100 text-slate-700 border-slate-200"
                            }`}>
                              {employee.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <span className="flex items-center gap-1 text-[10px] font-bold text-[#5e3f3c] bg-white border border-[#e5e2e1] px-2 py-1 rounded">
                                <span className="material-symbols-outlined text-[12px]">calendar_month</span> {employee.schedule_count || 0}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] font-bold text-[#5e3f3c] bg-white border border-[#e5e2e1] px-2 py-1 rounded">
                                <span className="material-symbols-outlined text-[12px]">event_available</span> {employee.availability_count || 0}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                className="bg-white border border-[#e5e2e1] hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] text-[#1A1A1A] rounded-lg px-3 py-1.5 text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                                onClick={async () => {
                                  setSelectedEmployee(employee);
                                  await loadEmployeeDetail(employee.id);
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                                Edit
                              </button>
                              <button
                                className="bg-red-50 border border-red-200 hover:bg-red-100 text-[#c8102e] rounded-lg px-2 py-1.5 transition-colors cursor-pointer"
                                onClick={() => deleteEmployee(employee.id)}
                                title="Delete Employee"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            
            {/* Context Panel (Shows Detail or Departments) */}
            {selectedEmployee ? (
              <div className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)] space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="border-b border-[#e5e2e1] pb-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Managing Profile</div>
                  <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </h2>
                  <div className="text-sm font-mono text-primary mt-1">{selectedEmployee.employee_number}</div>
                </div>

                <div className="rounded-2xl border border-[#e5e2e1] p-4 bg-[#fcf9f8]">
                  <div className="text-sm font-bold text-[#1A1A1A] mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#5e3f3c] text-[18px]">key</span>
                    Permissions
                  </div>
                  <textarea
                    className="w-full bg-white border border-[#e5e2e1] rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
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
                    className="mt-3 bg-white border border-[#e5e2e1] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] font-bold rounded-lg px-4 py-2 text-xs transition-colors shadow-sm"
                    onClick={updatePermissions}
                  >
                    Update Permissions
                  </button>
                </div>

                <div className="rounded-2xl border border-[#e5e2e1] p-4 bg-[#fcf9f8]">
                  <div className="text-sm font-bold text-[#1A1A1A] mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#5e3f3c] text-[18px]">calendar_month</span>
                    Staff Scheduling
                  </div>
                  <div className="grid gap-3 mb-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Date</label>
                        <input
                          className="w-full bg-white border border-[#e5e2e1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                          type="date"
                          value={scheduleForm.scheduleDate}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, scheduleDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Status</label>
                        <select
                          className="w-full bg-white border border-[#e5e2e1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                          value={scheduleForm.status}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, status: e.target.value })}
                        >
                          <option value="SCHEDULED">Scheduled</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                          <option value="NO_SHOW">No show</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Start Time</label>
                        <input
                          className="w-full bg-white border border-[#e5e2e1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                          type="time"
                          value={scheduleForm.shiftStart}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, shiftStart: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">End Time</label>
                        <input
                          className="w-full bg-white border border-[#e5e2e1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                          type="time"
                          value={scheduleForm.shiftEnd}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, shiftEnd: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <input
                        className="w-full bg-white border border-[#e5e2e1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                        placeholder="Location"
                        value={scheduleForm.location}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
                      />
                    </div>
                  </div>
                  <button
                    className="bg-[#1A1A1A] hover:bg-black text-white font-bold rounded-lg px-4 py-2 text-xs transition-colors shadow-sm flex items-center gap-1"
                    onClick={addSchedule}
                    disabled={savingSchedule}
                  >
                    {savingSchedule ? <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span> : <span className="material-symbols-outlined text-[14px]">add</span>}
                    Add Schedule
                  </button>
                  
                  {/* Schedule List */}
                  <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                    {(selectedEmployee.schedules || []).length === 0 ? (
                      <div className="text-[11px] text-[#5e3f3c] italic">No schedules defined.</div>
                    ) : (selectedEmployee.schedules || []).map((schedule) => (
                      <div key={schedule.id} className="rounded-lg bg-white border border-[#e5e2e1] p-3 text-xs flex justify-between items-center shadow-sm">
                        <div>
                          <div className="font-bold text-[#1A1A1A]">{schedule.schedule_date}</div>
                          <div className="text-[#5e3f3c] font-mono">{schedule.shift_start} - {schedule.shift_end}</div>
                          {schedule.location && <div className="text-[#5e3f3c] mt-0.5 flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">location_on</span>{schedule.location}</div>}
                        </div>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-slate-100 border border-slate-200">
                          {schedule.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e5e2e1] p-4 bg-[#fcf9f8]">
                  <div className="text-sm font-bold text-[#1A1A1A] mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#5e3f3c] text-[18px]">event_available</span>
                    Availability Tracking
                  </div>
                  <div className="grid gap-3 mb-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Date (Opt)</label>
                        <input
                          className="w-full bg-white border border-[#e5e2e1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                          type="date"
                          value={availabilityForm.availabilityDate}
                          onChange={(e) => setAvailabilityForm({ ...availabilityForm, availabilityDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Day (0-6)</label>
                        <input
                          className="w-full bg-white border border-[#e5e2e1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                          type="number" min={0} max={6}
                          placeholder="0=Sun"
                          value={availabilityForm.dayOfWeek}
                          onChange={(e) => setAvailabilityForm({ ...availabilityForm, dayOfWeek: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">From Time</label>
                        <input
                          className="w-full bg-white border border-[#e5e2e1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                          type="time"
                          value={availabilityForm.availableFrom}
                          onChange={(e) => setAvailabilityForm({ ...availabilityForm, availableFrom: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">To Time</label>
                        <input
                          className="w-full bg-white border border-[#e5e2e1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                          type="time"
                          value={availabilityForm.availableTo}
                          onChange={(e) => setAvailabilityForm({ ...availabilityForm, availableTo: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    className="bg-[#1A1A1A] hover:bg-black text-white font-bold rounded-lg px-4 py-2 text-xs transition-colors shadow-sm flex items-center gap-1"
                    onClick={addAvailability}
                    disabled={savingAvailability}
                  >
                    {savingAvailability ? <span className="material-symbols-outlined text-[14px] animate-spin">refresh</span> : <span className="material-symbols-outlined text-[14px]">add</span>}
                    Add Availability
                  </button>
                  
                  {/* Availability List */}
                  <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                    {(selectedEmployee.availability || []).length === 0 ? (
                      <div className="text-[11px] text-[#5e3f3c] italic">No availability recorded.</div>
                    ) : (selectedEmployee.availability || []).map((entry) => (
                      <div key={entry.id} className="rounded-lg bg-white border border-[#e5e2e1] p-3 text-xs flex justify-between items-center shadow-sm">
                        <div>
                          <div className="font-bold text-[#1A1A1A]">{entry.availability_date || `Day ${entry.day_of_week}`}</div>
                          {entry.available_from && <div className="text-[#5e3f3c] font-mono">{entry.available_from} - {entry.available_to || ""}</div>}
                        </div>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-green-50 text-green-700 border border-green-200">
                          {entry.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Individual Activity */}
                <div className="rounded-2xl border border-[#e5e2e1] p-4 bg-white shadow-sm">
                  <div className="text-sm font-bold text-[#1A1A1A] mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#5e3f3c] text-[18px]">history</span>
                    Recent Activity
                  </div>
                  <div className="space-y-3">
                    {(selectedEmployee.activity || []).length === 0 ? (
                      <div className="text-[11px] text-[#5e3f3c] italic">No activity recorded.</div>
                    ) : (selectedEmployee.activity || []).slice(0, 5).map((entry) => (
                      <div key={entry.id} className="flex gap-3 text-xs border-b border-[#e5e2e1] last:border-0 pb-2 last:pb-0">
                        <span className="material-symbols-outlined text-[#5e3f3c] text-[14px] mt-0.5">adjust</span>
                        <div>
                          <div className="font-medium text-[#1A1A1A]">{entry.action}</div>
                          <div className="text-[10px] text-[#5e3f3c]">{new Date(entry.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)] animate-in fade-in">
                <h2 className="text-xl font-bold text-[#1A1A1A] mb-6 flex items-center gap-2 border-b border-[#e5e2e1] pb-4">
                  <span className="material-symbols-outlined text-primary">domain</span>
                  Departments
                </h2>
                
                <div className="grid gap-4 mb-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Code</label>
                    <input
                      className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors text-sm"
                      placeholder="e.g. FLT"
                      value={departmentForm.code}
                      onChange={(e) => setDepartmentForm({ ...departmentForm, code: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Name</label>
                    <input
                      className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors text-sm"
                      placeholder="e.g. Flight Operations"
                      value={departmentForm.name}
                      onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Description</label>
                    <input
                      className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors text-sm"
                      placeholder="Department function..."
                      value={departmentForm.description || ""}
                      onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
                    />
                  </div>
                  <button
                    className="bg-[#1A1A1A] hover:bg-black text-white font-bold rounded-xl px-6 py-3 transition-colors shadow-sm flex items-center justify-center gap-2 mt-2"
                    onClick={saveDepartment}
                    disabled={savingDepartment}
                  >
                    <span className="material-symbols-outlined text-[20px]">add_business</span>
                    Create Department
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="text-sm font-bold text-[#1A1A1A] mb-2">Existing Departments</div>
                  {departments.length === 0 ? (
                    <div className="p-4 bg-[#fcf9f8] border border-dashed border-[#e5e2e1] rounded-xl text-center text-[#5e3f3c] text-sm">No departments exist.</div>
                  ) : departments.map((department) => (
                    <div key={department.id} className="rounded-xl border border-[#e5e2e1] bg-white p-4 shadow-sm flex items-start justify-between">
                      <div>
                        <div className="font-bold text-[#1A1A1A]">{department.name}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-primary mt-0.5">{department.code}</div>
                        {department.description && <div className="text-xs text-[#5e3f3c] mt-1">{department.description}</div>}
                      </div>
                      <button
                        className="text-[#c8102e] hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                        onClick={() => deleteDepartment(department.id)}
                        title="Delete Department"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Global Activity Feed */}
        <section className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)]">
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-6 flex items-center gap-2 border-b border-[#e5e2e1] pb-4">
            <span className="material-symbols-outlined text-[#5e3f3c]">local_activity</span>
            System Activity Feed
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {activity.length === 0 ? (
              <div className="col-span-full p-8 text-center text-[#5e3f3c] bg-[#fcf9f8] rounded-2xl border border-dashed border-[#e5e2e1]">
                No recent staff activity.
              </div>
            ) : (
              activity.slice(0, 12).map((entry) => (
                <div key={entry.id} className="rounded-xl bg-[#fcf9f8] border border-[#e5e2e1] p-4 flex gap-3">
                  <div className="bg-white border border-[#e5e2e1] w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[16px] text-primary">person_check</span>
                  </div>
                  <div>
                    <div className="font-bold text-[#1A1A1A] text-sm">{entry.action}</div>
                    <div className="text-xs text-[#5e3f3c] mt-0.5">
                      {entry.first_name ? `${entry.first_name} ${entry.last_name}` : entry.employee_id}
                    </div>
                    <div className="text-[10px] font-mono text-[#5e3f3c] mt-1">
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
