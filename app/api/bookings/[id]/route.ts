import { NextResponse } from "next/server";
import { cancelBooking, getBooking, modifyBooking } from "../../../../lib/bookings";

export async function GET(req: Request, context: any) {
  const params = await context?.params;
  const id = params?.id;
  const booking = await getBooking(id);
  if (!booking)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ booking });
}

export async function PATCH(req: Request, context: any) {
  const params = await context?.params;
  const body = await req.json().catch(() => ({}));
  const result = await modifyBooking(params?.id, body.changes || body, body.actor);
  return NextResponse.json(result);
}

export async function DELETE(req: Request, context: any) {
  const params = await context?.params;
  const body = await req.json().catch(() => ({}));
  const booking = await cancelBooking(params?.id, {
    reason: body.reason || "Deleted through booking inquiry",
    actor: body.actor || "user",
  });
  return NextResponse.json({ booking });
}
