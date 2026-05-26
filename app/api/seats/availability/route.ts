import { NextResponse } from "next/server";
import {
  getClassAvailability,
  getSeatsForFlight,
  getSeatOccupancySummary,
} from "../../../../lib/seats";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const flightId = url.searchParams.get("flightId");
  const requestedClass = url.searchParams.get("class");
  if (!flightId)
    return NextResponse.json({ error: "missing_flightId" }, { status: 400 });
  const [seats, summary, classAvailability] = await Promise.all([
    getSeatsForFlight(flightId),
    getSeatOccupancySummary(flightId),
    getClassAvailability(flightId, requestedClass),
  ]);
  return NextResponse.json({ seats, summary, classAvailability });
}
