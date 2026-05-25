import { NextResponse } from "next/server";
import {
  deleteDepartment,
  getDepartment,
  updateDepartment,
} from "../../../../../lib/employees";

export async function GET(_request: Request, context: any) {
  const department = getDepartment(context?.params?.id);
  if (!department)
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ department });
}

export async function PATCH(request: Request, context: any) {
  const body: any = await request.json().catch(() => ({}));
  try {
    const department = updateDepartment(context?.params?.id, body);
    return NextResponse.json({ department });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "error" },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: any) {
  try {
    const department = deleteDepartment(context?.params?.id);
    return NextResponse.json({ department });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "error" },
      { status: 400 },
    );
  }
}
