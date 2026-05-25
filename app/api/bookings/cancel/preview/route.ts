import { NextResponse } from "next/server";
import { previewCancellation } from "../../../../../lib/bookings";

export async function POST(req: Request) {
  const body = await req.json();
  const { bookingId, passengerIds, forceRefund } = body || {};
  try {
    const preview = await previewCancellation(
      bookingId,
      passengerIds,
      forceRefund,
    );
    return NextResponse.json(preview);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "error" }, { status: 400 });
  }
}
