import { NextResponse } from "next/server";
import { getCancellationReport } from "../../../../../lib/bookings";

export async function GET() {
  const report = await getCancellationReport();
  return NextResponse.json({ report });
}
