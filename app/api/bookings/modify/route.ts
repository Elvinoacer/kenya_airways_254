import { NextResponse } from "next/server";
import { modifyBooking } from "../../../../lib/bookings";

export async function PATCH(req: Request) {
  const body = await req.json();
  const { bookingId, changes, actor } = body;
  try {
    const res = await modifyBooking(bookingId, changes, actor);
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "error" }, { status: 400 });
  }
}
