import { NextResponse } from "next/server";
import analytics from "../../../lib/analytics";

export async function GET(req: Request) {
  try {
    // Lightweight admin guard: require `x-admin-token` header to match ENV var ADMIN_API_TOKEN when set
    const adminToken = process.env.ADMIN_API_TOKEN;
    if (adminToken) {
      const header =
        (req.headers as any).get?.("x-admin-token") ||
        (req.headers as any)["x-admin-token"];
      if (!header || header !== adminToken) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
    }
    const url = new URL(req.url);
    const metric = (url.searchParams.get("metric") || "revenue").toLowerCase();
    const from = url.searchParams.get("from") || undefined;
    const to = url.searchParams.get("to") || undefined;
    switch (metric) {
      case "revenue":
        return NextResponse.json(
          await analytics.revenueAnalytics({
            from,
            to,
            interval: (url.searchParams.get("interval") as any) || "day",
          }),
        );
      case "occupancy":
        return NextResponse.json(
          await analytics.flightOccupancyAnalytics({ from, to }),
        );
      case "peak_routes":
        return NextResponse.json(
          await analytics.peakRouteAnalytics({
            from,
            to,
            limit: Number(url.searchParams.get("limit") || 10),
          }),
        );
      case "passenger_trends":
        return NextResponse.json(
          await analytics.passengerTrends({
            from,
            to,
            interval: (url.searchParams.get("interval") as any) || "month",
          }),
        );
      case "booking_trends":
        return NextResponse.json(
          await analytics.bookingTrends({
            from,
            to,
            interval: (url.searchParams.get("interval") as any) || "day",
          }),
        );
      case "cancellations":
        return NextResponse.json(
          await analytics.cancellationAnalytics({ from, to }),
        );
      case "forecast_revenue":
        return NextResponse.json(
          await analytics.forecastingRevenue({
            from,
            to,
            periods: Number(url.searchParams.get("periods") || 6),
            interval: (url.searchParams.get("interval") as any) || "month",
          }),
        );
      case "kpis":
        return NextResponse.json(await analytics.kpiTracking({ from, to }));
      default:
        return NextResponse.json({ error: "unknown metric" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 },
    );
  }
}
