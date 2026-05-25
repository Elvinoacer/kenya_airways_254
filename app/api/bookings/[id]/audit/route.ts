import { NextResponse } from "next/server";
import { getBookingAudit } from "../../../../../lib/bookings";

export async function GET(req: Request, context: any) {
  const id = context?.params?.id;
  const audit = await getBookingAudit(id);
  return NextResponse.json({ audit });
}
