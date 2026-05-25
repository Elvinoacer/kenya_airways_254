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

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.scheduleId) params.set("scheduleId", filters.scheduleId);
    if (filters.status) params.set("status", filters.status);
    if (filters.role) params.set("role", filters.role);
    return params.toString();
  }, [filters]);

  async function load() {
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
  const conflictAssignments = assignments.filter(
    (assignment) => assignment.status === "CONFLICT",
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Staff Assignment</h1>
        <p className="text-sm text-gray-600">
          Create crew assignments, match employees to schedules, approve
          allocations, and review conflicts and history.
        </p>
      </div>

      <section className="grid gap-3 rounded border p-4 md:grid-cols-4">
        <select
          className="rounded border p-2"
          value={filters.scheduleId}
          onChange={(e) =>
            setFilters({ ...filters, scheduleId: e.target.value })
          }
        >
          <option value="">All schedules</option>
          {schedules.map((schedule) => (
            <option key={schedule.id} value={schedule.id}>
              {schedule.flight_number || schedule.flight_id} •{" "}
              {new Date(schedule.departure_time).toLocaleString()}
            </option>
          ))}
        </select>
        <select
          className="rounded border p-2"
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
        <select
          className="rounded border p-2"
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
        <button className="rounded border px-3 py-2" onClick={load}>
          Refresh
        </button>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="rounded border p-4">
            <h2 className="font-medium">Create staffing requirement</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <select
                className="rounded border p-2"
                value={selectedScheduleId}
                onChange={(e) => setSelectedScheduleId(e.target.value)}
              >
                <option value="">Select schedule</option>
                {schedules.map((schedule) => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.flight_number || schedule.flight_id} •{" "}
                    {new Date(schedule.departure_time).toLocaleString()}
                  </option>
                ))}
              </select>
              <select
                className="rounded border p-2"
                value={requirementForm.role}
                onChange={(e) =>
                  setRequirementForm({
                    ...requirementForm,
                    role: e.target.value,
                  })
                }
              >
                <option value="PILOT">Pilot</option>
                <option value="CAPTAIN">Captain</option>
                <option value="FIRST_OFFICER">First officer</option>
                <option value="CABIN_CREW">Cabin crew</option>
                <option value="GROUND_STAFF">Ground staff</option>
                <option value="OPERATIONS">Operations</option>
              </select>
              <input
                className="rounded border p-2"
                type="number"
                min={1}
                value={requirementForm.requiredCount}
                onChange={(e) =>
                  setRequirementForm({
                    ...requirementForm,
                    requiredCount: e.target.value,
                  })
                }
                placeholder="Required count"
              />
              <input
                className="rounded border p-2 md:col-span-2"
                value={requirementForm.notes}
                onChange={(e) =>
                  setRequirementForm({
                    ...requirementForm,
                    notes: e.target.value,
                  })
                }
                placeholder="Notes"
              />
            </div>
            <button
              className="mt-3 rounded bg-black px-4 py-2 text-white"
              onClick={createRequirement}
            >
              Add requirement
            </button>
            <div className="mt-4 space-y-2 text-sm">
              {requirements.length === 0 ? (
                <div className="text-gray-600">
                  No staffing requirements for this view.
                </div>
              ) : (
                requirements.map((requirement) => (
                  <div key={requirement.id} className="rounded bg-gray-50 p-2">
                    {requirement.role} × {requirement.required_count}{" "}
                    {requirement.notes ? `• ${requirement.notes}` : ""}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded border p-4">
            <h2 className="font-medium">Create assignment</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <select
                className="rounded border p-2"
                value={selectedScheduleId}
                onChange={(e) => setSelectedScheduleId(e.target.value)}
              >
                <option value="">Select schedule</option>
                {schedules.map((schedule) => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.flight_number || schedule.flight_id} •{" "}
                    {new Date(schedule.departure_time).toLocaleString()}
                  </option>
                ))}
              </select>
              <select
                className="rounded border p-2"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
              >
                <option value="">Open assignment / no employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name} •{" "}
                    {employee.employee_role}
                  </option>
                ))}
              </select>
              <select
                className="rounded border p-2"
                value={assignmentForm.role}
                onChange={(e) =>
                  setAssignmentForm({ ...assignmentForm, role: e.target.value })
                }
              >
                <option value="PILOT">Pilot</option>
                <option value="CAPTAIN">Captain</option>
                <option value="FIRST_OFFICER">First officer</option>
                <option value="CABIN_CREW">Cabin crew</option>
                <option value="GROUND_STAFF">Ground staff</option>
                <option value="OPERATIONS">Operations</option>
              </select>
              <input
                className="rounded border p-2"
                type="number"
                min={1}
                value={assignmentForm.requiredCount}
                onChange={(e) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    requiredCount: e.target.value,
                  })
                }
                placeholder="Required count"
              />
              <label className="flex items-center gap-2 text-sm md:col-span-2">
                <input
                  type="checkbox"
                  checked={assignmentForm.approvalRequired}
                  onChange={(e) =>
                    setAssignmentForm({
                      ...assignmentForm,
                      approvalRequired: e.target.checked,
                    })
                  }
                />
                Require manual approval
              </label>
              <input
                className="rounded border p-2 md:col-span-2"
                value={assignmentForm.openText}
                onChange={(e) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    openText: e.target.value,
                  })
                }
                placeholder="Open assignment text or matching note"
              />
              <input
                className="rounded border p-2 md:col-span-2"
                value={assignmentForm.notes}
                onChange={(e) =>
                  setAssignmentForm({
                    ...assignmentForm,
                    notes: e.target.value,
                  })
                }
                placeholder="Notes"
              />
            </div>
            <button
              className="mt-3 rounded bg-black px-4 py-2 text-white"
              onClick={createAssignment}
            >
              Create assignment
            </button>
          </div>

          <div className="rounded border p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium">Open assignment tracking</h2>
              <span className="text-sm text-gray-600">
                {openAssignments.length} open
              </span>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {openAssignments.length === 0 ? (
                <div className="text-gray-600">No open assignments.</div>
              ) : (
                openAssignments.map((assignment) => (
                  <div key={assignment.id} className="rounded bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">
                          {assignment.assignment_role} •{" "}
                          {assignment.flight_number || assignment.flight_id}
                        </div>
                        <div className="text-xs text-gray-500">
                          {assignment.status} • {assignment.source} • Score{" "}
                          {assignment.match_score || 0}
                        </div>
                        <div className="text-xs text-gray-500">
                          {assignment.first_name
                            ? `${assignment.first_name} ${assignment.last_name}`
                            : "No employee assigned"}
                        </div>
                        {assignment.conflict_reason ? (
                          <div className="text-xs text-red-600">
                            {assignment.conflict_reason}
                          </div>
                        ) : null}
                      </div>
                      <button
                        className="rounded border px-2 py-1"
                        onClick={() => {
                          setSelectedAssignmentId(assignment.id);
                        }}
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded border p-4">
            <h2 className="font-medium">Match reporting</h2>
            <div className="mt-3 space-y-2 text-sm">
              {matches.length === 0 ? (
                <div className="text-gray-600">
                  No match recommendations available.
                </div>
              ) : (
                matches.map((entry: any) => (
                  <div
                    key={`${entry.schedule.id}-${entry.requirement.id}`}
                    className="rounded bg-gray-50 p-3"
                  >
                    <div className="font-medium">
                      {entry.schedule.flight_number || entry.schedule.flight_id}{" "}
                      • {entry.requirement.role} ×{" "}
                      {entry.requirement.required_count}
                    </div>
                    <div className="mt-2 space-y-1">
                      {entry.candidates.slice(0, 5).map((candidate: any) => (
                        <div
                          key={candidate.employeeId}
                          className="flex items-center justify-between gap-2 rounded border bg-white px-2 py-1"
                        >
                          <span>
                            {candidate.name} • {candidate.role}
                          </span>
                          <span className="text-xs text-gray-500">
                            Score {candidate.score}
                            {candidate.conflict
                              ? ` • ${candidate.conflict}`
                              : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded border p-4">
            <h2 className="font-medium">Assignment history</h2>
            <div className="mt-3 space-y-2 text-sm">
              {selectedAssignmentId ? (
                <AssignmentHistory assignmentId={selectedAssignmentId} />
              ) : (
                <div className="text-gray-600">
                  Select an assignment to inspect its history.
                </div>
              )}
            </div>
          </div>

          <div className="rounded border p-4">
            <h2 className="font-medium">Assignment actions</h2>
            <div className="mt-3 space-y-2 text-sm">
              {assignments.slice(0, 10).map((assignment) => (
                <div key={assignment.id} className="rounded border p-3">
                  <div className="font-medium">
                    {assignment.assignment_role} •{" "}
                    {assignment.flight_number || assignment.flight_id}
                  </div>
                  <div className="text-xs text-gray-500">
                    {assignment.status}{" "}
                    {assignment.first_name
                      ? `• ${assignment.first_name} ${assignment.last_name}`
                      : ""}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      className="rounded border px-2 py-1"
                      onClick={() => updateAssignment(assignment.id, "APPROVE")}
                    >
                      Approve
                    </button>
                    <button
                      className="rounded border px-2 py-1"
                      onClick={() =>
                        updateAssignment(
                          assignment.id,
                          "ASSIGN",
                          undefined,
                          selectedEmployeeId || undefined,
                        )
                      }
                    >
                      Assign selected
                    </button>
                    <button
                      className="rounded border px-2 py-1"
                      onClick={() =>
                        updateAssignment(assignment.id, "COMPLETE")
                      }
                    >
                      Complete
                    </button>
                    <button
                      className="rounded border px-2 py-1"
                      onClick={() =>
                        updateAssignment(
                          assignment.id,
                          "CANCEL",
                          "Cancelled by planner",
                        )
                      }
                    >
                      Cancel
                    </button>
                    <button
                      className="rounded border px-2 py-1"
                      onClick={() =>
                        updateAssignment(
                          assignment.id,
                          "REJECT",
                          "Rejected by planner",
                        )
                      }
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded border p-4">
            <h2 className="font-medium">Assignment report</h2>
            <div className="mt-2 text-sm text-gray-600">
              {report ? (
                <>
                  <div>Total assignments: {report.totalAssignments}</div>
                  <div>Open assignments: {report.openAssignments}</div>
                  <div>Conflicts: {report.conflictAssignments}</div>
                </>
              ) : (
                <div>Loading report...</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded border p-4">
        <h2 className="font-medium">Current assignments</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-2">Flight</th>
                <th className="p-2">Employee</th>
                <th className="p-2">Role</th>
                <th className="p-2">Status</th>
                <th className="p-2">Score</th>
                <th className="p-2">Conflict</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td className="p-3" colSpan={6}>
                    No assignments found
                  </td>
                </tr>
              ) : (
                assignments.map((assignment) => (
                  <tr key={assignment.id} className="border-t">
                    <td className="p-2">
                      {assignment.flight_number || assignment.flight_id}
                    </td>
                    <td className="p-2">
                      {assignment.first_name
                        ? `${assignment.first_name} ${assignment.last_name}`
                        : "Open"}
                    </td>
                    <td className="p-2">{assignment.assignment_role}</td>
                    <td className="p-2">{assignment.status}</td>
                    <td className="p-2">{assignment.match_score || 0}</td>
                    <td className="p-2">{assignment.conflict_reason || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AssignmentHistory({ assignmentId }: { assignmentId: string }) {
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/assignments/${assignmentId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setDetail(data?.assignment || null));
  }, [assignmentId]);

  if (!detail) return <div className="text-gray-600">Loading history...</div>;

  return (
    <div className="space-y-2">
      {detail.history?.length ? (
        detail.history.map((entry: any) => (
          <div key={entry.id} className="rounded bg-gray-50 p-2">
            <div className="font-medium">{entry.action}</div>
            <div className="text-xs text-gray-500">
              {new Date(entry.created_at).toLocaleString()}
            </div>
          </div>
        ))
      ) : (
        <div className="text-gray-600">No history yet.</div>
      )}
    </div>
  );
}
