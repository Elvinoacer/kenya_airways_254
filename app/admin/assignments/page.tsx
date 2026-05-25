"use client";

import React, { useEffect, useMemo, useState } from "react";

export default function StaffAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [filters, setFilters] = useState({
    scheduleId: "",
    status: "",
    role: "",
  });
  const [requirementForm, setRequirementForm] = useState({
    role: "CABIN_CREW",
    requiredCount: "1",
    notes: "",
  });
  const [assignmentForm, setAssignmentForm] = useState({
    role: "CABIN_CREW",
    openText: "",
    notes: "",
    approvalRequired: false,
    requiredCount: "1",
  });
  const [loading, setLoading] = useState(true);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.scheduleId) params.set("scheduleId", filters.scheduleId);
    if (filters.status) params.set("status", filters.status);
    if (filters.role) params.set("role", filters.role);
    return params.toString();
  }, [filters]);

  async function load() {
    setLoading(true);
    const [assignRes, reqRes, matchRes, reportRes, schedRes, empRes] =
      await Promise.all([
        fetch(`/api/assignments${queryString ? `?${queryString}` : ""}`),
        fetch(
          filters.scheduleId
            ? `/api/assignments/requirements?scheduleId=${encodeURIComponent(filters.scheduleId)}`
            : "/api/assignments/requirements",
        ),
        fetch(
          filters.scheduleId
            ? `/api/assignments/matches?scheduleId=${encodeURIComponent(filters.scheduleId)}`
            : "/api/assignments/matches",
        ),
        fetch("/api/assignments/report"),
        fetch("/api/schedules"),
        fetch("/api/employees"),
      ]);
    const assignData = assignRes.ok
      ? await assignRes.json()
      : { assignments: [] };
    const reqData = reqRes.ok ? await reqRes.json() : { requirements: [] };
    const matchData = matchRes.ok ? await matchRes.json() : { matches: [] };
    const reportData = reportRes.ok ? await reportRes.json() : null;
    const schedData = schedRes.ok ? await schedRes.json() : { schedules: [] };
    const empData = empRes.ok ? await empRes.json() : { employees: [] };
    
    setAssignments(assignData.assignments || []);
    setRequirements(reqData.requirements || []);
    setMatches(matchData.matches || []);
    setReport(reportData);
    setSchedules(schedData.schedules || []);
    setEmployees(empData.employees || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [queryString]);

  async function createRequirement() {
    if (!selectedScheduleId) return alert("Select a schedule first");
    const res = await fetch("/api/assignments/requirements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flightScheduleId: selectedScheduleId,
        role: requirementForm.role,
        requiredCount: Number(requirementForm.requiredCount) || 1,
        notes: requirementForm.notes,
        actor: "admin",
      }),
    });
    if (!res.ok) return alert("Could not create requirement");
    setRequirementForm({ role: "CABIN_CREW", requiredCount: "1", notes: "" });
    await load();
  }

  async function createAssignment() {
    if (!selectedScheduleId) return alert("Select a schedule first");
    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flightScheduleId: selectedScheduleId,
        employeeId: selectedEmployeeId || undefined,
        role: assignmentForm.role,
        requiredCount: Number(assignmentForm.requiredCount) || 1,
        approvalRequired: assignmentForm.approvalRequired,
        openText: assignmentForm.openText,
        notes: assignmentForm.notes,
        source: selectedEmployeeId ? "MANUAL" : "MATCHED",
        actor: "admin",
      }),
    });
    if (!res.ok) return alert("Could not create assignment");
    setAssignmentForm({
      role: "CABIN_CREW",
      openText: "",
      notes: "",
      approvalRequired: false,
      requiredCount: "1",
    });
    setSelectedEmployeeId("");
    await load();
  }

  async function updateAssignment(
    id: string,
    action: string,
    reason?: string,
    employeeId?: string,
  ) {
    const res = await fetch("/api/assignments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, actor: "admin", reason, employeeId }),
    });
    if (!res.ok) return alert("Assignment action failed");
    await load();
  }

  const openAssignments = assignments.filter(
    (assignment) =>
      !assignment.employee_id ||
      ["OPEN", "PENDING_APPROVAL"].includes(assignment.status),
  );

  return (
    <div className="text-[#1A1A1A]">
      <header className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-6 lg:px-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
              Staff Operations
            </div>
            <h1 className="text-3xl font-black text-[#1A1A1A]">
              Crew Assignments
            </h1>
            <p className="text-sm text-[#5e3f3c] mt-2 max-w-2xl">
              Create crew assignments, match employees to schedules, approve
              allocations, and review conflicts.
            </p>
          </div>
        </div>
      </header>

      <main className="p-6 lg:p-8 space-y-8 max-w-[1600px]">
        {/* Filters */}
        <section className="bg-white rounded-2xl border border-[#e5e2e1] p-4 flex flex-wrap gap-4 items-center shadow-sm">
          <div className="flex items-center gap-2 text-[#5e3f3c]">
            <span className="material-symbols-outlined text-[20px]">filter_list</span>
            <span className="text-sm font-bold">Filters:</span>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <select
              className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium"
              value={filters.scheduleId}
              onChange={(e) => setFilters({ ...filters, scheduleId: e.target.value })}
            >
              <option value="">All schedules</option>
              {schedules.map((schedule) => (
                <option key={schedule.id} value={schedule.id}>
                  {schedule.flight_number || schedule.flight_id} • {new Date(schedule.departure_time).toLocaleString()}
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
              <option value="PILOT">Pilot</option>
              <option value="CAPTAIN">Captain</option>
              <option value="FIRST_OFFICER">First officer</option>
              <option value="CABIN_CREW">Cabin crew</option>
              <option value="GROUND_STAFF">Ground staff</option>
              <option value="OPERATIONS">Operations</option>
            </select>
          </div>

          <div className="w-full md:w-auto">
            <select
              className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-medium"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="PENDING_APPROVAL">Pending approval</option>
              <option value="APPROVED">Approved</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="REJECTED">Rejected</option>
              <option value="CONFLICT">Conflict</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <button 
            className="flex items-center gap-2 bg-[#fcf9f8] border border-[#e5e2e1] hover:bg-white text-[#1A1A1A] font-bold rounded-xl px-5 py-2.5 transition-colors shadow-sm"
            onClick={load}
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh
          </button>
        </section>

        {/* Top Analytics Row */}
        <section className="grid gap-6 md:grid-cols-3">
          <div className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Total Assignments</div>
              <div className="text-3xl font-black text-[#1A1A1A]">{report?.totalAssignments || 0}</div>
            </div>
            <div className="bg-[#fcf9f8] p-3 rounded-xl border border-[#e5e2e1]">
              <span className="material-symbols-outlined text-[#5e3f3c] text-[24px]">assignment</span>
            </div>
          </div>
          
          <div className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Open Assignments</div>
              <div className="text-3xl font-black text-amber-600">{report?.openAssignments || 0}</div>
            </div>
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
              <span className="material-symbols-outlined text-amber-600 text-[24px]">pending_actions</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Conflicts</div>
              <div className="text-3xl font-black text-[#c8102e]">{report?.conflictAssignments || 0}</div>
            </div>
            <div className="bg-red-50 p-3 rounded-xl border border-red-200">
              <span className="material-symbols-outlined text-[#c8102e] text-[24px]">warning</span>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1fr_1fr]">
          {/* Left Column: Actions */}
          <div className="space-y-8">
            
            {/* Create Requirement */}
            <div className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)]">
              <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Create Requirement</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Flight Schedule</label>
                  <select
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                    value={selectedScheduleId}
                    onChange={(e) => setSelectedScheduleId(e.target.value)}
                  >
                    <option value="">Select schedule</option>
                    {schedules.map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.flight_number || schedule.flight_id} • {new Date(schedule.departure_time).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Role</label>
                  <select
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                    value={requirementForm.role}
                    onChange={(e) => setRequirementForm({ ...requirementForm, role: e.target.value })}
                  >
                    <option value="PILOT">Pilot</option>
                    <option value="CAPTAIN">Captain</option>
                    <option value="FIRST_OFFICER">First officer</option>
                    <option value="CABIN_CREW">Cabin crew</option>
                    <option value="GROUND_STAFF">Ground staff</option>
                    <option value="OPERATIONS">Operations</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Required Count</label>
                  <input
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                    type="number"
                    min={1}
                    value={requirementForm.requiredCount}
                    onChange={(e) => setRequirementForm({ ...requirementForm, requiredCount: e.target.value })}
                    placeholder="e.g. 2"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Notes (Optional)</label>
                  <input
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                    value={requirementForm.notes}
                    onChange={(e) => setRequirementForm({ ...requirementForm, notes: e.target.value })}
                    placeholder="Specific requirements or details..."
                  />
                </div>
              </div>
              <button
                className="mt-6 w-full md:w-auto bg-primary hover:bg-[#e71520] text-white font-bold rounded-xl px-6 py-3 transition-colors shadow-[0_4px_12px_rgba(231,21,32,0.2)] flex items-center justify-center gap-2 cursor-pointer"
                onClick={createRequirement}
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Add Requirement
              </button>

              {/* Active Requirements List */}
              <div className="mt-8">
                <div className="text-sm font-bold text-[#1A1A1A] mb-3">Active Requirements</div>
                <div className="space-y-2">
                  {requirements.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-[#e5e2e1] bg-[#fcf9f8] text-center text-sm text-[#5e3f3c]">
                      No staffing requirements for this view.
                    </div>
                  ) : (
                    requirements.map((requirement) => (
                      <div key={requirement.id} className="rounded-xl border border-[#e5e2e1] bg-[#fcf9f8] p-3 flex justify-between items-center text-sm">
                        <div className="font-bold text-[#1A1A1A]">
                          {requirement.role} <span className="text-primary px-1">×</span> {requirement.required_count}
                        </div>
                        {requirement.notes && (
                          <div className="text-[#5e3f3c] italic text-xs ml-4 truncate max-w-[200px]">
                            {requirement.notes}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Create Assignment */}
            <div className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)]">
              <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Direct Assignment</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Flight Schedule</label>
                  <select
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                    value={selectedScheduleId}
                    onChange={(e) => setSelectedScheduleId(e.target.value)}
                  >
                    <option value="">Select schedule</option>
                    {schedules.map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.flight_number || schedule.flight_id} • {new Date(schedule.departure_time).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Employee</label>
                  <select
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  >
                    <option value="">Leave unassigned (Open Request)</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name} • {employee.employee_role}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Role</label>
                  <select
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                    value={assignmentForm.role}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, role: e.target.value })}
                  >
                    <option value="PILOT">Pilot</option>
                    <option value="CAPTAIN">Captain</option>
                    <option value="FIRST_OFFICER">First officer</option>
                    <option value="CABIN_CREW">Cabin crew</option>
                    <option value="GROUND_STAFF">Ground staff</option>
                    <option value="OPERATIONS">Operations</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Count</label>
                  <input
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                    type="number"
                    min={1}
                    value={assignmentForm.requiredCount}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, requiredCount: e.target.value })}
                  />
                </div>
                
                <div className="md:col-span-2 pt-2">
                  <label className="flex items-center gap-3 text-sm font-bold text-[#1A1A1A] cursor-pointer">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={assignmentForm.approvalRequired}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, approvalRequired: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </div>
                    Require Manual Approval
                  </label>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5e3f3c] mb-1">Open Request Text</label>
                  <input
                    className="w-full bg-[#fcf9f8] border border-[#e5e2e1] rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm"
                    value={assignmentForm.openText}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, openText: e.target.value })}
                    placeholder="Visible if unassigned..."
                  />
                </div>
              </div>
              <button
                className="mt-6 w-full md:w-auto bg-[#1A1A1A] hover:bg-black text-white font-bold rounded-xl px-6 py-3 transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
                onClick={createAssignment}
              >
                <span className="material-symbols-outlined text-[20px]">assignment_ind</span>
                Create Assignment
              </button>
            </div>
          </div>

          {/* Right Column: Tracking & Data */}
          <div className="space-y-8">
            
            {/* Open Assignments */}
            <div className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)]">
              <div className="flex items-center justify-between mb-4 border-b border-[#e5e2e1] pb-4">
                <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500">notifications_active</span>
                  Action Required
                </h2>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
                  {openAssignments.length} open
                </span>
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {openAssignments.length === 0 ? (
                  <div className="p-8 text-center text-[#5e3f3c]">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">task_alt</span>
                    <div className="text-sm font-bold">All caught up!</div>
                    <div className="text-xs">No pending assignments.</div>
                  </div>
                ) : (
                  openAssignments.map((assignment) => (
                    <div key={assignment.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 transition-colors hover:bg-amber-50">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-bold text-[#1A1A1A] text-base mb-1">
                            {assignment.assignment_role}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-[#5e3f3c] mb-2 font-mono">
                            <span className="material-symbols-outlined text-[16px]">flight</span>
                            {assignment.flight_number || assignment.flight_id}
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mb-2">
                            <StatusBadge status={assignment.status} />
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-white border border-[#e5e2e1] text-[#5e3f3c]">
                              {assignment.source}
                            </span>
                            {assignment.match_score > 0 && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-green-50 border border-green-200 text-green-700">
                                Match Score: {assignment.match_score}
                              </span>
                            )}
                          </div>
                          
                          <div className="text-sm font-medium text-[#1A1A1A]">
                            {assignment.first_name
                              ? <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">person</span> {assignment.first_name} {assignment.last_name}</span>
                              : <span className="text-amber-600 italic">Unassigned</span>}
                          </div>
                          
                          {assignment.conflict_reason && (
                            <div className="mt-2 text-xs font-bold text-[#c8102e] flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">error</span>
                              {assignment.conflict_reason}
                            </div>
                          )}
                        </div>
                        <button
                          className="rounded-lg bg-white border border-[#e5e2e1] px-3 py-1.5 text-xs font-bold text-[#1A1A1A] hover:bg-[#fcf9f8] transition-colors whitespace-nowrap shadow-sm cursor-pointer"
                          onClick={() => setSelectedAssignmentId(assignment.id)}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Match Recommendations */}
            <div className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)]">
              <h2 className="text-xl font-bold text-[#1A1A1A] mb-4 border-b border-[#e5e2e1] pb-4">Match Recommendations</h2>
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                {matches.length === 0 ? (
                  <div className="p-8 text-center text-[#5e3f3c] bg-[#fcf9f8] rounded-xl border border-dashed border-[#e5e2e1]">
                    <div className="text-sm font-bold">No match recommendations</div>
                    <div className="text-xs mt-1">System found no automated matches.</div>
                  </div>
                ) : (
                  matches.map((entry: any) => (
                    <div
                      key={`${entry.schedule.id}-${entry.requirement.id}`}
                      className="rounded-xl border border-[#e5e2e1] bg-white overflow-hidden shadow-sm"
                    >
                      <div className="bg-[#fcf9f8] px-4 py-3 border-b border-[#e5e2e1]">
                        <div className="font-bold text-[#1A1A1A] flex items-center justify-between">
                          <span>{entry.schedule.flight_number || entry.schedule.flight_id}</span>
                          <span className="text-primary text-sm">{entry.requirement.role} × {entry.requirement.required_count}</span>
                        </div>
                      </div>
                      <div className="p-2 space-y-1 bg-[#fcf9f8]/50">
                        {entry.candidates.slice(0, 3).map((candidate: any) => (
                          <div
                            key={candidate.employeeId}
                            className="flex items-center justify-between gap-4 rounded-lg bg-white border border-[#e5e2e1] px-3 py-2"
                          >
                            <div className="text-sm font-medium text-[#1A1A1A] truncate">
                              {candidate.name}
                            </div>
                            <div className="flex flex-col items-end shrink-0">
                              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                Score {candidate.score}
                              </span>
                              {candidate.conflict && (
                                <span className="text-[10px] text-[#c8102e] mt-1 truncate max-w-[150px]">
                                  {candidate.conflict}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </section>

        {/* Master Data Table */}
        <section className="bg-white rounded-3xl border border-[#e5e2e1] shadow-[0_8px_32px_rgba(13,13,13,0.06)] overflow-hidden">
          <div className="p-6 border-b border-[#e5e2e1] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#fcf9f8]">
            <div>
              <h2 className="text-xl font-bold text-[#1A1A1A]">Assignment Roster</h2>
              <p className="text-sm text-[#5e3f3c]">Complete list of all staff assignments and statuses.</p>
            </div>
            
            {/* Quick Actions Panel for Selected row if any */}
            {selectedAssignmentId && (
              <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-primary/30 shadow-sm animate-in fade-in slide-in-from-top-2">
                <span className="text-xs font-bold uppercase tracking-widest text-primary px-2">Actions:</span>
                
                <button
                  className="rounded-lg bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 text-xs font-bold hover:bg-green-100 transition-colors"
                  onClick={() => updateAssignment(selectedAssignmentId, "APPROVE")}
                >
                  Approve
                </button>
                <button
                  className="rounded-lg bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 text-xs font-bold hover:bg-blue-100 transition-colors"
                  onClick={() => updateAssignment(selectedAssignmentId, "ASSIGN", undefined, selectedEmployeeId || undefined)}
                  disabled={!selectedEmployeeId}
                  title={!selectedEmployeeId ? "Select an employee first" : ""}
                >
                  Assign User
                </button>
                <button
                  className="rounded-lg bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 text-xs font-bold hover:bg-slate-200 transition-colors"
                  onClick={() => updateAssignment(selectedAssignmentId, "COMPLETE")}
                >
                  Complete
                </button>
                <button
                  className="rounded-lg bg-red-50 border border-red-200 text-[#c8102e] px-3 py-1.5 text-xs font-bold hover:bg-red-100 transition-colors"
                  onClick={() => {
                    const reason = prompt("Reason for cancellation?");
                    if (reason) updateAssignment(selectedAssignmentId, "CANCEL", reason);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-white border border-[#e5e2e1] text-[#1A1A1A] px-2 py-1.5 hover:bg-slate-50 transition-colors"
                  onClick={() => setSelectedAssignmentId("")}
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center p-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-[11px] font-bold uppercase tracking-widest text-[#5e3f3c] bg-white border-b border-[#e5e2e1]">
                  <tr>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Flight</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Match Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e2e1] bg-white">
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-[#5e3f3c]">
                        No assignments found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    assignments.map((assignment) => {
                      const isSelected = selectedAssignmentId === assignment.id;
                      return (
                        <tr 
                          key={assignment.id} 
                          className={`transition-colors cursor-pointer hover:bg-[#fcf9f8] ${isSelected ? "bg-[#fcf9f8] border-l-4 border-l-primary" : "border-l-4 border-l-transparent"}`}
                          onClick={() => setSelectedAssignmentId(isSelected ? "" : assignment.id)}
                        >
                          <td className="px-6 py-4">
                            <StatusBadge status={assignment.status} />
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-[#1A1A1A]">
                            {assignment.flight_number || assignment.flight_id}
                          </td>
                          <td className="px-6 py-4 font-medium text-[#1A1A1A]">
                            {assignment.assignment_role}
                          </td>
                          <td className="px-6 py-4">
                            {assignment.first_name ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                                  {assignment.first_name[0]}{assignment.last_name[0]}
                                </div>
                                <span className="font-medium text-[#1A1A1A]">{assignment.first_name} {assignment.last_name}</span>
                              </div>
                            ) : (
                              <span className="text-[#5e3f3c] italic text-xs bg-slate-100 px-2 py-1 rounded">Open Request</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              {assignment.match_score > 0 && (
                                <span className="text-xs font-bold text-green-600">Score: {assignment.match_score}</span>
                              )}
                              {assignment.conflict_reason ? (
                                <span className="text-xs font-bold text-[#c8102e] max-w-[200px] truncate" title={assignment.conflict_reason}>
                                  {assignment.conflict_reason}
                                </span>
                              ) : (
                                <span className="text-xs text-[#5e3f3c]">{assignment.source}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
        
        {/* History Panel (Only shows if something is selected) */}
        {selectedAssignmentId && (
          <section className="bg-white rounded-3xl border border-[#e5e2e1] p-6 shadow-[0_8px_32px_rgba(13,13,13,0.06)] animate-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-4 border-b border-[#e5e2e1] pb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#5e3f3c]">history</span>
              Assignment History
            </h2>
            <AssignmentHistory assignmentId={selectedAssignmentId} />
          </section>
        )}
        
      </main>
    </div>
  );
}

// Reusable Status Badge Component matching the operations page style
function StatusBadge({ status }: { status: string }) {
  if (!status) return null;
  const s = status.toUpperCase();
  
  let colorClass = "bg-slate-100 text-slate-700 border-slate-200";
  if (["COMPLETED", "APPROVED", "ASSIGNED"].includes(s)) {
    colorClass = "bg-green-50 text-green-700 border-green-200";
  } else if (["OPEN", "PENDING_APPROVAL"].includes(s)) {
    colorClass = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (["CONFLICT", "CANCELLED", "REJECTED"].includes(s)) {
    colorClass = "bg-red-50 text-[#c8102e] border-red-200";
  }

  return (
    <span className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest border ${colorClass} whitespace-nowrap inline-block`}>
      {status.replace("_", " ")}
    </span>
  );
}

function AssignmentHistory({ assignmentId }: { assignmentId: string }) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/assignments/${assignmentId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setDetail(data?.assignment || null);
        setLoading(false);
      });
  }, [assignmentId]);

  if (loading) return (
    <div className="flex items-center justify-center py-4">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  
  if (!detail) return <div className="text-sm text-[#5e3f3c] italic p-4 bg-[#fcf9f8] rounded-xl border border-dashed border-[#e5e2e1]">History not available.</div>;

  return (
    <div className="space-y-3 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#e5e2e1] before:to-transparent">
      {detail.history?.length ? (
        detail.history.map((entry: any, i: number) => (
          <div key={entry.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
               <span className="material-symbols-outlined text-[14px]">history_edu</span>
            </div>
            
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-[#fcf9f8] border border-[#e5e2e1] p-4 rounded-xl shadow-sm">
              <div className="flex items-center justify-between space-x-2 mb-1">
                <div className="font-bold text-[#1A1A1A] text-sm">{entry.action}</div>
                <time className="font-mono text-[10px] font-medium text-[#5e3f3c] bg-white px-2 py-0.5 rounded border border-[#e5e2e1]">
                  {new Date(entry.created_at).toLocaleString()}
                </time>
              </div>
              <div className="text-xs text-[#5e3f3c]">Actor: {entry.actor || "System"}</div>
              {entry.reason && (
                <div className="mt-2 text-xs italic bg-white p-2 rounded border border-[#e5e2e1] text-[#1A1A1A]">
                  "{entry.reason}"
                </div>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="text-sm text-[#5e3f3c] italic p-4 bg-[#fcf9f8] rounded-xl border border-dashed border-[#e5e2e1] relative z-10 text-center">
          No history events recorded.
        </div>
      )}
    </div>
  );
}
