import { NextResponse } from "next/server";
import { getBooking } from "../../../../lib/bookings";

export async function GET(req: Request, context: any) {
  const id = context?.params?.id;
  const booking = await getBooking(id);
  if (!booking)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ booking });
}
