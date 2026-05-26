import { NextResponse } from "next/server";
import admin from "@/lib/admin";

export async function GET(req: Request) {
  try {
    const users = await admin.listUsers(500);
    return NextResponse.json({ data: users });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, role } = body;
    if (!id || !role)
      return NextResponse.json(
        { error: "id and role required" },
        { status: 400 },
      );
    const updated = await admin.setUserRole(id, role);
    return NextResponse.json({ data: updated });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
