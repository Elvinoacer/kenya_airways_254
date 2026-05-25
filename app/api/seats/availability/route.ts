import { NextResponse } from "next/server";
import {
  getSeatsForFlight,
  getSeatOccupancySummary,
} from "../../../../lib/seats";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const flightId = url.searchParams.get("flightId");
  if (!flightId)
    return NextResponse.json({ error: "missing_flightId" }, { status: 400 });
  const seats = getSeatsForFlight(flightId);
  const summary = getSeatOccupancySummary(flightId);
  return NextResponse.json({ seats, summary });
}
