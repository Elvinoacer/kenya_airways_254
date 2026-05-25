import { NextResponse } from "next/server";
import {
  deleteEmployee,
  getEmployee,
  updateEmployee,
} from "../../../../lib/employees";

export async function GET(_request: Request, context: any) {
  const employee = getEmployee(context?.params?.id);
  if (!employee)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ employee });
}

export async function PATCH(request: Request, context: any) {
  const body: any = await request.json().catch(() => ({}));
  try {
    const employee = updateEmployee(context?.params?.id, { ...body });
    return NextResponse.json({ employee });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "error" },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: any) {
  try {
    const employee = deleteEmployee(context?.params?.id, "api");
    return NextResponse.json({ employee });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "error" },
      { status: 400 },
    );
  }
}
