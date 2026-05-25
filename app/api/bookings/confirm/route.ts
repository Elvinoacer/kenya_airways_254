import { NextResponse } from "next/server";
import { confirmBooking } from "../../../../lib/bookings";

export async function POST(req: Request) {
  const body = await req.json();
  const { holdId, payment } = body;
  try {
    const res = await confirmBooking(holdId, payment);
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "error" }, { status: 400 });
  }
}
