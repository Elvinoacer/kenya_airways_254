import { NextResponse } from "next/server";
import admin from "@/lib/admin";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get("key");
    if (key) {
      const s = admin.getSetting(key);
      return NextResponse.json({ data: s });
    }
    // list settings
    const rows = admin.listFeatureToggles();
    return NextResponse.json({ data: rows });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { key, value, description } = body;
    if (!key)
      return NextResponse.json({ error: "key required" }, { status: 400 });
    const s = admin.setSetting(key, value || "", description || null);
    return NextResponse.json({ data: s });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
