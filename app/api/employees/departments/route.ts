import { NextResponse } from "next/server";
import { createDepartment, listDepartments } from "../../../../lib/employees";

export async function GET() {
  return NextResponse.json({ departments: listDepartments() });
}

export async function POST(request: Request) {
  const body: any = await request.json().catch(() => ({}));
  if (!body.name) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const department = createDepartment({
    code: body.code,
    name: body.name,
    description: body.description,
    managerEmployeeId: body.managerEmployeeId,
    actor: body.actor,
  });
  return NextResponse.json({ department }, { status: 201 });
}
