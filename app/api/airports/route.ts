import { NextResponse } from "next/server";
import { searchAirports, nearbyAirports } from "../../../lib/airports";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");

  if (lat && lon) {
    const latN = Number(lat);
    const lonN = Number(lon);
    return NextResponse.json({ nearby: nearbyAirports(latN, lonN) });
  }

  return NextResponse.json({ results: searchAirports(q, 10) });
}
