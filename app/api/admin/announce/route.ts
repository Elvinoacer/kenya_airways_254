import { NextResponse } from "next/server";
import admin from "@/lib/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subject, message, actor } = body;
    if (!message)
      return NextResponse.json({ error: "message required" }, { status: 400 });
    const res = admin.announceGlobal(subject || null, message, actor || null);
    return NextResponse.json({ data: res });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
