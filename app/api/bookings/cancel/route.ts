import { NextResponse } from "next/server";
import { cancelBooking } from "../../../../lib/bookings";

export async function POST(req: Request) {
  const body = await req.json();
  const {
    bookingId,
    reason,
    requestedByRole,
    passengerIds,
    actor,
    notes,
    forceRefund,
  } = body || {};
  try {
    const res = await cancelBooking(bookingId, {
      reason,
      requestedByRole,
      passengerIds,
      actor,
      notes,
      forceRefund,
    });
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "error" }, { status: 400 });
  }
}
