import { prisma } from "./prisma";

function isoDate(date?: string | Date) {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function revenueAnalytics({
  from,
  to,
  interval = "day",
}: {
  from?: string;
  to?: string;
  interval?: "day" | "month" | "year";
}) {
  const fromIso = isoDate(from) || "1970-01-01T00:00:00.000Z";
  const toIso = isoDate(to) || new Date().toISOString();

  // Using native SQL for complex aggregations on PostgreSQL
  const formatStr = interval === "month" ? "YYYY-MM" : interval === "year" ? "YYYY" : "YYYY-MM-DD";

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `
    SELECT TO_CHAR("createdAt", '${formatStr}') AS period,
      COUNT(*)::int AS payments_count,
      COALESCE(SUM("amount"), 0) AS revenue
    FROM "Payment"
    WHERE "createdAt" >= $1::timestamp AND "createdAt" <= $2::timestamp
    GROUP BY period
    ORDER BY period ASC
  `,
    new Date(fromIso),
    new Date(toIso),
  );

  return rows.map((r: any) => ({
    ...r,
    revenue: Number(r.revenue),
  }));
}

export async function flightOccupancyAnalytics({ from, to }: { from?: string; to?: string }) {
  const fromIso = isoDate(from) || "1970-01-01T00:00:00.000Z";
  const toIso = isoDate(to) || new Date().toISOString();

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `
    SELECT f."id" as flight_id, f."flightNumber" as flight_number, s."id" as schedule_id, s."departureTime" as departure_time,
      (SELECT COUNT(*)::int FROM "Seat" WHERE "flightId" = f."id") AS total_seats,
      (SELECT COUNT(*)::int FROM "Booking" b WHERE b."flightId" = f."id" AND b."status" IN ('CONFIRMED','COMPLETED') AND b."createdAt" >= $1::timestamp AND b."createdAt" <= $2::timestamp) AS booked_seats
    FROM "FlightSchedule" s
    JOIN "Flight" f ON f."id" = s."flightId"
    WHERE s."departureTime" >= $3::timestamp AND s."departureTime" <= $4::timestamp
    ORDER BY s."departureTime" ASC
  `,
    new Date(fromIso),
    new Date(toIso),
    new Date(fromIso),
    new Date(toIso),
  );

  return rows.map((r: any) => ({
    ...r,
    total_seats: Number(r.total_seats || 0),
    booked_seats: Number(r.booked_seats || 0),
    occupancy_pct: r.total_seats ? Math.round((Number(r.booked_seats) / Number(r.total_seats)) * 100) : 0,
  }));
}

export async function peakRouteAnalytics({ from, to, limit = 10 }: { from?: string; to?: string; limit?: number }) {
  const fromIso = isoDate(from) || "1970-01-01T00:00:00.000Z";
  const toIso = isoDate(to) || new Date().toISOString();

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `
    SELECT f."origin", f."destination", COUNT(b."id")::int AS bookings_count, COALESCE(SUM(p."amount"), 0) AS revenue
    FROM "Flight" f
    LEFT JOIN "Booking" b ON b."flightId" = f."id" AND b."status" IN ('CONFIRMED','COMPLETED') AND b."createdAt" >= $1::timestamp AND b."createdAt" <= $2::timestamp
    LEFT JOIN "Payment" p ON p."bookingId" = b."id"
    GROUP BY f."origin", f."destination"
    ORDER BY bookings_count DESC
    LIMIT $3
  `,
    new Date(fromIso),
    new Date(toIso),
    limit,
  );

  return rows.map((r: any) => ({
    ...r,
    revenue: Number(r.revenue),
  }));
}

export async function bookingTrends({
  from,
  to,
  interval = "day",
}: {
  from?: string;
  to?: string;
  interval?: "day" | "month" | "year";
}) {
  const fromIso = isoDate(from) || "1970-01-01T00:00:00.000Z";
  const toIso = isoDate(to) || new Date().toISOString();
  const formatStr = interval === "month" ? "YYYY-MM" : interval === "year" ? "YYYY" : "YYYY-MM-DD";

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `
    SELECT TO_CHAR(b."createdAt", '${formatStr}') AS period, 
      COUNT(*)::int AS bookings, 
      (SELECT COUNT(*)::int FROM "BookingPassenger" bp WHERE bp."bookingId" = b."id") AS seats_booked
    FROM "Booking" b
    WHERE b."createdAt" >= $1::timestamp AND b."createdAt" <= $2::timestamp
    GROUP BY period, b."id"
  `,
    new Date(fromIso),
    new Date(toIso),
  );

  // Aggregate since we grouped by booking ID to get seats
  const aggregated = rows.reduce((acc: any, row: any) => {
    if (!acc[row.period]) {
      acc[row.period] = { period: row.period, bookings: 0, seats_booked: 0 };
    }
    acc[row.period].bookings += 1;
    acc[row.period].seats_booked += Number(row.seats_booked || 0);
    return acc;
  }, {});

  return Object.values(aggregated).sort((a: any, b: any) => a.period.localeCompare(b.period));
}

export async function cancellationAnalytics({ from, to }: { from?: string; to?: string }) {
  const fromIso = isoDate(from) || "1970-01-01T00:00:00.000Z";
  const toIso = isoDate(to) || new Date().toISOString();

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `
    SELECT "reason", COUNT(*)::int AS cancellations, COALESCE(SUM("cancelledSeats"), 0) AS seats_affected
    FROM "BookingCancellation"
    WHERE "cancelledAt" >= $1::timestamp AND "cancelledAt" <= $2::timestamp
    GROUP BY "reason"
    ORDER BY cancellations DESC
  `,
    new Date(fromIso),
    new Date(toIso),
  );

  return rows.map((r: any) => ({
    ...r,
    seats_affected: Number(r.seats_affected),
  }));
}

export async function passengerTrends({
  from,
  to,
  interval = "month",
}: {
  from?: string;
  to?: string;
  interval?: "day" | "month" | "year";
}) {
  // Mock passenger trends as we don't have a specific passenger_travel_history table in Prisma
  // We'll base it on BookingPassenger creation instead
  const fromIso = isoDate(from) || "1970-01-01T00:00:00.000Z";
  const toIso = isoDate(to) || new Date().toISOString();
  const formatStr = interval === "month" ? "YYYY-MM" : interval === "year" ? "YYYY" : "YYYY-MM-DD";

  const rows = await prisma.$queryRawUnsafe<any[]>(
    `
    SELECT TO_CHAR(bp."createdAt", '${formatStr}') AS period, 
      COUNT(*)::int AS trips, 
      COUNT(DISTINCT bp."passengerId")::int AS unique_passengers
    FROM "BookingPassenger" bp
    JOIN "Booking" b ON b."id" = bp."bookingId"
    WHERE b."status" IN ('CONFIRMED', 'COMPLETED') AND bp."createdAt" >= $1::timestamp AND bp."createdAt" <= $2::timestamp
    GROUP BY period
    ORDER BY period ASC
  `,
    new Date(fromIso),
    new Date(toIso),
  );

  return rows;
}

export async function forecastingRevenue({
  from,
  to,
  periods = 6,
  interval = "month",
}: {
  from?: string;
  to?: string;
  periods?: number;
  interval?: "month" | "day" | "year";
}) {
  const hist = await revenueAnalytics({
    from,
    to,
    interval: interval === "month" ? "month" : interval === "year" ? "year" : "day",
  });
  if (!hist || hist.length === 0) return { series: [], forecast: [] };

  const revenues = hist.map((r: any) => Number(r.revenue || 0));
  const growths: number[] = [];
  for (let i = 1; i < revenues.length; i++) {
    const prev = revenues[i - 1] || 0;
    const cur = revenues[i] || 0;
    growths.push(prev === 0 ? 0 : (cur - prev) / prev);
  }
  const avgGrowth = growths.length ? growths.reduce((a, b) => a + b, 0) / growths.length : 0;
  const last = revenues[revenues.length - 1] || 0;
  const forecast: number[] = [];
  let value = last;
  for (let i = 0; i < periods; i++) {
    value = value * (1 + avgGrowth);
    forecast.push(Math.round(value * 100) / 100);
  }
  return { series: hist, forecast, avgGrowth };
}

export async function kpiTracking({ from, to }: { from?: string; to?: string }) {
  const fromIso = isoDate(from) || "1970-01-01T00:00:00.000Z";
  const toIso = isoDate(to) || new Date().toISOString();

  const totals = await prisma.$queryRawUnsafe<any[]>(
    `
    SELECT 
      (SELECT COALESCE(SUM("amount"), 0) FROM "Payment" WHERE "createdAt" >= $1::timestamp AND "createdAt" <= $2::timestamp) as total_revenue,
      (SELECT COUNT(*)::int FROM "Booking" WHERE "createdAt" >= $1::timestamp AND "createdAt" <= $2::timestamp) as total_bookings,
      (SELECT AVG("totalAmount") FROM "Booking" WHERE "createdAt" >= $1::timestamp AND "createdAt" <= $2::timestamp) as avg_booking_value,
      (SELECT COUNT(*)::int FROM "BookingCancellation" WHERE "cancelledAt" >= $1::timestamp AND "cancelledAt" <= $2::timestamp) as cancellations
  `,
    new Date(fromIso),
    new Date(toIso),
  );

  const row = totals[0];
  const cancellationRate = row.total_bookings ? (row.cancellations || 0) / row.total_bookings : 0;

  const occ = await prisma.$queryRawUnsafe<any[]>(
    `
    SELECT
      COALESCE(SUM(b_booked.booked), 0)::int AS booked_seats,
      COALESCE(SUM(seat_counts.total), 0)::int AS total_seats
    FROM (
      SELECT "flightId", COUNT(*)::int as booked FROM "Booking" b WHERE b."createdAt" >= $1::timestamp AND b."createdAt" <= $2::timestamp AND b."status" IN ('CONFIRMED','COMPLETED') GROUP BY "flightId"
    ) b_booked
    LEFT JOIN (
      SELECT "flightId", COUNT(*)::int as total FROM "Seat" GROUP BY "flightId"
    ) seat_counts ON seat_counts."flightId" = b_booked."flightId"
  `,
    new Date(fromIso),
    new Date(toIso),
  );

  const occRow = occ[0];

  return {
    totalRevenue: Number(row?.total_revenue || 0),
    totalBookings: Number(row?.total_bookings || 0),
    avgBookingValue: Number(row?.avg_booking_value || 0),
    cancellations: Number(row?.cancellations || 0),
    cancellationRate: Number(cancellationRate || 0),
    occupancy:
      occRow && Number(occRow.total_seats) > 0
        ? Math.round((Number(occRow.booked_seats) / Number(occRow.total_seats)) * 100)
        : null,
  };
}

export default {
  revenueAnalytics,
  flightOccupancyAnalytics,
  peakRouteAnalytics,
  passengerTrends,
  bookingTrends,
  cancellationAnalytics,
  forecastingRevenue,
  kpiTracking,
};
