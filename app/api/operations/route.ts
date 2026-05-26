import { NextResponse } from "next/server";
import { getOperationsDashboardData } from "../../../lib/operations-dashboard";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") || 15);
  return NextResponse.json(await getOperationsDashboardData(limit));
}
