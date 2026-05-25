import { NextResponse } from "next/server";
import { getBookingHistory } from "../../../../../lib/bookings";

export async function GET(req: Request, context: any) {
  const id = context?.params?.id;
  const hist = await getBookingHistory(id);
  return NextResponse.json({ history: hist });
}
