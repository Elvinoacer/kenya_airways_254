import { NextResponse } from "next/server";
import { lockSeat, unlockSeat } from "../../../../lib/seats";

export async function POST(request: Request) {
  const body: any = await request.json().catch(() => ({}));
  const { seatId, flightId, userId, bookingId, ttlSeconds } = body;
  if (!seatId || !flightId)
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const res = lockSeat({
    seatId,
    flightId,
    userId,
    bookingId,
    ttlSeconds: ttlSeconds || 300,
  });
  if (!res.success) return NextResponse.json(res, { status: 409 });
  return NextResponse.json(res, { status: 201 });
}

export async function DELETE(request: Request) {
  const body: any = await request.json().catch(() => ({}));
  const { lockId } = body;
  if (!lockId)
    return NextResponse.json({ error: "missing_lockId" }, { status: 400 });
  const res = unlockSeat(lockId);
  if (!res.success) return NextResponse.json(res, { status: 404 });
  return NextResponse.json(res);
}
