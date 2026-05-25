import { NextResponse } from "next/server";
import { generateMockFlights } from "../../../lib/flights";

export async function GET() {
  const flights = generateMockFlights();
  const counts: Record<string, number> = {};
  for (const f of flights)
    counts[f.destination] = (counts[f.destination] || 0) + 1;
  const popular = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([iata]) => iata);
  return NextResponse.json({ popular });
}
