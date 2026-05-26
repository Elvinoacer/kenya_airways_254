import { NextResponse } from "next/server";
import {
  getSeatsForFlight,
  getSeatOccupancySummary,
} from "../../../../lib/seats";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const flightId = url.searchParams.get("flightId");
  const seatClass = url.searchParams.get("class");
  const filter = url.searchParams.get("filter"); // e.g., 'window' or 'aisle' or 'accessible'
  if (!flightId)
    return NextResponse.json({ error: "missing_flightId" }, { status: 400 });
  let seats: any[] = await getSeatsForFlight(flightId);
  const summary = await getSeatOccupancySummary(flightId);
  if (seatClass)
    seats = seats.filter((s) => s.seat_class === seatClass.toUpperCase());
  if (filter) {
    const f = filter.toLowerCase();
    if (f === "accessible") seats = seats.filter((s) => s.is_accessible);
    else
      seats = seats.filter((s) =>
        (s.preference_tags || "")
          .toLowerCase()
          .split(",")
          .map((t: string) => t.trim())
          .includes(f),
      );
  }
  return NextResponse.json({ seats, summary });
}
