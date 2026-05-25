import { NextResponse } from "next/server";
import admin from "@/lib/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { enabled } = body;
    const ok = admin.enableMaintenanceMode(Boolean(enabled));
    return NextResponse.json({ data: ok });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const s = admin.getSetting("maintenance_mode");
    return NextResponse.json({ data: s });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
