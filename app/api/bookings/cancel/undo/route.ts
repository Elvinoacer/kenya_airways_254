import { NextResponse } from "next/server";
import { undoCancellation } from "../../../../../lib/bookings";

export async function POST(req: Request) {
  const body = await req.json();
  const { bookingId, actor } = body || {};
  try {
    const res = await undoCancellation(bookingId, actor);
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "error" }, { status: 400 });
  }
}
