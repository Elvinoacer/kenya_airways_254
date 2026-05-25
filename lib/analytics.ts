import { query } from "./db";

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
  const fromIso = isoDate(from) || "1970-01-01T00:00:00Z";
  const toIso = isoDate(to) || new Date().toISOString();
  const fmt =
    interval === "month" ? "%Y-%m" : interval === "year" ? "%Y" : "%Y-%m-%d";
  const rows = query.all<any>(
    `
    SELECT strftime('${fmt}', p.created_at) AS period,
      COUNT(*) AS payments_count,
      COALESCE(SUM(p.amount),0) AS revenue
    FROM payments p
    WHERE datetime(p.created_at) BETWEEN datetime(?) AND datetime(?)
    GROUP BY period
    ORDER BY period ASC
  `,
    [fromIso, toIso],
  );
  return rows;
}

export async function flightOccupancyAnalytics({
  from,
  to,
}: {
  from?: string;
  to?: string;
}) {
  const fromIso = isoDate(from) || "1970-01-01T00:00:00Z";
  const toIso = isoDate(to) || new Date().toISOString();
  const rows = query.all<any>(
    `
    SELECT f.id as flight_id, f.flight_number, s.id as schedule_id, s.departure_time,
      (SELECT COUNT(*) FROM seats WHERE flight_id = f.id) AS total_seats,
      (SELECT COUNT(*) FROM bookings_v2 b WHERE b.flight_id = f.id AND b.status IN ('CONFIRMED','COMPLETED') AND datetime(b.created_at) BETWEEN datetime(?) AND datetime(?)) AS booked_seats
    FROM flight_schedules s
    JOIN flights f ON f.id = s.flight_id
    WHERE datetime(s.departure_time) BETWEEN datetime(?) AND datetime(?)
    ORDER BY s.departure_time ASC
  `,
    [fromIso, toIso, fromIso, toIso],
  );
  return rows.map((r) => ({
    ...r,
    total_seats: Number(r.total_seats || 0),
    booked_seats: Number(r.booked_seats || 0),
    occupancy_pct: r.total_seats
      ? Math.round((r.booked_seats / r.total_seats) * 100)
      : 0,
  }));
}

export async function peakRouteAnalytics({
  from,
  to,
  limit = 10,
}: {
  from?: string;
  to?: string;
  limit?: number;
}) {
  const fromIso = isoDate(from) || "1970-01-01T00:00:00Z";
  const toIso = isoDate(to) || new Date().toISOString();
  const rows = query.all<any>(
    `
    SELECT f.origin, f.destination, COUNT(b.id) AS bookings_count, COALESCE(SUM(p.amount),0) AS revenue
    FROM flights f
    LEFT JOIN bookings_v2 b ON b.flight_id = f.id AND b.status IN ('CONFIRMED','COMPLETED') AND datetime(b.created_at) BETWEEN datetime(?) AND datetime(?)
    LEFT JOIN payments p ON p.booking_id = b.id
    GROUP BY f.origin, f.destination
    ORDER BY bookings_count DESC
    LIMIT ?
  `,
    [fromIso, toIso, limit],
  );
  return rows;
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
  const fromIso = isoDate(from) || "1970-01-01T00:00:00Z";
  const toIso = isoDate(to) || new Date().toISOString();
  const fmt =
    interval === "year" ? "%Y" : interval === "day" ? "%Y-%m-%d" : "%Y-%m";
  const rows = query.all<any>(
    `
    SELECT strftime('${fmt}', ph.travel_at) AS period, COUNT(*) AS trips, COUNT(DISTINCT ph.passenger_profile_id) AS unique_passengers
    FROM passenger_travel_history ph
    WHERE datetime(ph.travel_at) BETWEEN datetime(?) AND datetime(?)
    GROUP BY period
    ORDER BY period ASC
  `,
    [fromIso, toIso],
  );
  return rows;
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
  const fromIso = isoDate(from) || "1970-01-01T00:00:00Z";
  const toIso = isoDate(to) || new Date().toISOString();
  const fmt =
    interval === "month" ? "%Y-%m" : interval === "year" ? "%Y" : "%Y-%m-%d";
  const rows = query.all<any>(
    `
    SELECT strftime('${fmt}', b.created_at) AS period, COUNT(*) AS bookings, COALESCE(SUM(b.seats),0) AS seats_booked
    FROM bookings_v2 b
    WHERE datetime(b.created_at) BETWEEN datetime(?) AND datetime(?)
    GROUP BY period
    ORDER BY period ASC
  `,
    [fromIso, toIso],
  );
  return rows;
}

export async function cancellationAnalytics({
  from,
  to,
}: {
  from?: string;
  to?: string;
}) {
  const fromIso = isoDate(from) || "1970-01-01T00:00:00Z";
  const toIso = isoDate(to) || new Date().toISOString();
  const rows = query.all<any>(
    `
    SELECT reason, COUNT(*) AS cancellations, COALESCE(SUM(cancelled_seats),0) AS seats_affected
    FROM booking_cancellations
    WHERE datetime(cancelled_at) BETWEEN datetime(?) AND datetime(?)
    GROUP BY reason
    ORDER BY cancellations DESC
  `,
    [fromIso, toIso],
  );
  return rows;
}

// Very simple forecasting: linear projection based on average period-over-period growth
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
  // get historical revenue per interval
  const hist = await revenueAnalytics({
    from,
    to,
    interval:
      interval === "month" ? "month" : interval === "year" ? "year" : "day",
  });
  if (!hist || hist.length === 0) return { series: [], forecast: [] };
  // compute simple growth rates
  const revenues = hist.map((r: any) => Number(r.revenue || 0));
  const growths: number[] = [];
  for (let i = 1; i < revenues.length; i++) {
    const prev = revenues[i - 1] || 0;
    const cur = revenues[i] || 0;
    growths.push(prev === 0 ? 0 : (cur - prev) / prev);
  }
  const avgGrowth = growths.length
    ? growths.reduce((a, b) => a + b, 0) / growths.length
    : 0;
  const last = revenues[revenues.length - 1] || 0;
  const forecast: number[] = [];
  let value = last;
  for (let i = 0; i < periods; i++) {
    value = value * (1 + avgGrowth);
    forecast.push(Math.round(value * 100) / 100);
  }
  return { series: hist, forecast, avgGrowth };
}

export async function kpiTracking({
  from,
  to,
}: {
  from?: string;
  to?: string;
}) {
  const fromIso = isoDate(from) || "1970-01-01T00:00:00Z";
  const toIso = isoDate(to) || new Date().toISOString();
  const totalRevenue = query.get<any>(
    `SELECT COALESCE(SUM(amount),0) as total FROM payments WHERE datetime(created_at) BETWEEN datetime(?) AND datetime(?)`,
    [fromIso, toIso],
  );
  const totalBookings = query.get<any>(
    `SELECT COUNT(*) as bookings FROM bookings_v2 WHERE datetime(created_at) BETWEEN datetime(?) AND datetime(?)`,
    [fromIso, toIso],
  );
  const avgBookingValue = query.get<any>(
    `SELECT AVG(total_price) as avg_value FROM bookings WHERE datetime(created_at) BETWEEN datetime(?) AND datetime(?)`,
    [fromIso, toIso],
  );
  const cancellations = query.get<any>(
    `SELECT COUNT(*) as cancellations FROM booking_cancellations WHERE datetime(cancelled_at) BETWEEN datetime(?) AND datetime(?)`,
    [fromIso, toIso],
  );
  const cancellationRate = totalBookings?.bookings
    ? (cancellations?.cancellations || 0) / totalBookings.bookings
    : 0;
  // occupancy overall: sum booked seats / sum total seats across schedules in period
  const occ = query.get<any>(
    `
    SELECT
      COALESCE(SUM(b_booked.booked),0) AS booked_seats,
      COALESCE(SUM(seat_counts.total),0) AS total_seats
    FROM (
      SELECT flight_id, COUNT(*) as booked FROM bookings_v2 b WHERE datetime(b.created_at) BETWEEN datetime(?) AND datetime(?) AND b.status IN ('CONFIRMED','COMPLETED') GROUP BY flight_id
    ) b_booked
    LEFT JOIN (
      SELECT flight_id, COUNT(*) as total FROM seats GROUP BY flight_id
    ) seat_counts ON seat_counts.flight_id = b_booked.flight_id
  `,
    [fromIso, toIso],
  );

  return {
    totalRevenue: Number(totalRevenue?.total || 0),
    totalBookings: Number(totalBookings?.bookings || 0),
    avgBookingValue: Number(avgBookingValue?.avg_value || 0),
    cancellations: Number(cancellations?.cancellations || 0),
    cancellationRate: Number(cancellationRate || 0),
    occupancy:
      occ && occ.total_seats
        ? Math.round((occ.booked_seats / occ.total_seats) * 100)
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
