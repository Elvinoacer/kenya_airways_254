import { NextResponse } from "next/server";
import { createEmployee, listEmployees } from "../../../lib/employees";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const employees = listEmployees({
    q: url.searchParams.get("q") || undefined,
    departmentId: url.searchParams.get("departmentId") || undefined,
    role: url.searchParams.get("role") || undefined,
    status: url.searchParams.get("status") || undefined,
    availabilityDate: url.searchParams.get("availabilityDate") || undefined,
  });
  return NextResponse.json({ employees });
}

export async function POST(request: Request) {
  const body: any = await request.json().catch(() => ({}));
  if (!body.firstName || !body.lastName || !body.employeeRole) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const employee = createEmployee({
    userId: body.userId,
    employeeNumber: body.employeeNumber,
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    phone: body.phone,
    jobTitle: body.jobTitle,
    employeeRole: body.employeeRole,
    departmentId: body.departmentId,
    employmentType: body.employmentType,
    status: body.status,
    permissions: body.permissions,
    profile: body.profile,
    notes: body.notes,
    hiredAt: body.hiredAt,
    managerEmployeeId: body.managerEmployeeId,
    actor: body.actor,
  });
  return NextResponse.json({ employee }, { status: 201 });
}
