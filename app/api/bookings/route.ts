import { NextResponse } from "next/server";
import { createHold } from "../../../lib/bookings";

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const res = await createHold(body);
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "error" }, { status: 400 });
  }
}
