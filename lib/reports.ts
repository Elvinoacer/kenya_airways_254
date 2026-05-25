import { query } from "./db";

function isoDate(date?: string | Date) {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function getBookingReport({
  from,
  to,
}: {
  from?: string;
  to?: string;
}) {
  const fromIso = isoDate(from) || "1970-01-01T00:00:00Z";
  const toIso = isoDate(to) || new Date().toISOString();

  // Using bookings_v2 as primary booking table
  const rows = query.all<any>(
    `
    SELECT b.id, b.booking_ref, b.flight_id, b.seat_class, b.seats, b.fare_json, b.passengers_json, b.status, b.created_at
    FROM bookings_v2 b
    WHERE datetime(b.created_at) BETWEEN datetime(?) AND datetime(?)
    ORDER BY b.created_at ASC
  `,
    [fromIso, toIso],
  );

  return rows;
}

export async function getRevenueReport({
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
    SELECT p.id, p.booking_id, p.amount, p.currency, p.provider, p.status, p.created_at
    FROM payments p
    WHERE datetime(p.created_at) BETWEEN datetime(?) AND datetime(?)
    ORDER BY p.created_at ASC
  `,
    [fromIso, toIso],
  );

  return rows;
}

export async function getOccupancyReport({
  from,
  to,
}: {
  from?: string;
  to?: string;
}) {
  // occupancy by flight schedule
  const rows = query.all<any>(
    `
    SELECT s.id as schedule_id, f.id as flight_id, f.flight_number, s.departure_time,
      (SELECT COUNT(*) FROM seats WHERE flight_id = f.id) AS total_seats,
      (SELECT COUNT(*) FROM bookings_v2 b WHERE b.flight_id = f.id AND b.status = 'CONFIRMED') AS booked_seats
    FROM flight_schedules s
    JOIN flights f ON f.id = s.flight_id
    ORDER BY s.departure_time ASC
  `,
    [],
  );

  return rows.map((r) => ({
    ...r,
    occupied: Number(r.booked_seats || 0),
    total: Number(r.total_seats || 0),
    percent: r.total_seats
      ? Math.round((r.booked_seats / r.total_seats) * 100)
      : 0,
  }));
}

export async function getPassengerManifest({
  scheduleId,
}: {
  scheduleId?: string;
}) {
  if (!scheduleId) return [];
  const rows = query.all<any>(
    `
    SELECT b.booking_ref, b.passengers_json, b.contact_email, b.contact_phone, b.seat_class, b.seats
    FROM bookings_v2 b
    WHERE b.flight_id = ? AND b.status IN ('CONFIRMED','COMPLETED')
    ORDER BY b.created_at ASC
  `,
    [scheduleId],
  );
  return rows;
}

export async function getFlightSummary({
  scheduleId,
}: {
  scheduleId?: string;
}) {
  if (!scheduleId) return null;
  const summary = query.get<any>(
    `
    SELECT s.id as schedule_id, f.id as flight_id, f.flight_number, s.departure_time, s.arrival_time,
      (SELECT COUNT(*) FROM bookings_v2 b WHERE b.flight_id = f.id AND b.status IN ('CONFIRMED','COMPLETED')) AS booked_seats,
      (SELECT COALESCE(SUM(p.amount),0) FROM payments p WHERE p.booking_id IN (SELECT id FROM bookings_v2 WHERE flight_id = f.id)) AS revenue
    FROM flight_schedules s
    JOIN flights f ON f.id = s.flight_id
    WHERE s.id = ?
  `,
    [scheduleId],
  );
  return summary;
}

export async function getCancellationReport({
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
    SELECT c.*, b.booking_ref, b.flight_id
    FROM booking_cancellations c
    LEFT JOIN bookings b ON b.id = c.booking_id
    WHERE datetime(c.cancelled_at) BETWEEN datetime(?) AND datetime(?)
    ORDER BY c.cancelled_at ASC
  `,
    [fromIso, toIso],
  );
  return rows;
}

export async function getRefundReport({
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
    SELECT r.*, p.provider as payment_provider
    FROM refunds r
    LEFT JOIN payments p ON p.id = r.payment_id
    WHERE datetime(r.requested_at) BETWEEN datetime(?) AND datetime(?)
    ORDER BY r.requested_at ASC
  `,
    [fromIso, toIso],
  );
  return rows;
}

export async function getPaymentReport({
  from,
  to,
}: {
  from?: string;
  to?: string;
}) {
  return getRevenueReport({ from, to });
}

// STAFF REPORTS
export async function getAssignmentReport({
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
    SELECT a.id, a.flight_schedule_id, a.flight_id, a.employee_id, a.assignment_role, a.status, a.match_score, a.created_at, a.updated_at,
      e.first_name, e.last_name
    FROM staff_assignments a
    LEFT JOIN employees e ON e.id = a.employee_id
    WHERE datetime(a.created_at) BETWEEN datetime(?) AND datetime(?)
    ORDER BY a.created_at ASC
  `,
    [fromIso, toIso],
  );
  return rows;
}

export async function getStaffPerformanceReport({
  employeeId,
  from,
  to,
}: {
  employeeId?: string;
  from?: string;
  to?: string;
}) {
  const fromIso = isoDate(from) || "1970-01-01T00:00:00Z";
  const toIso = isoDate(to) || new Date().toISOString();
  const params: any[] = [fromIso, toIso];
  let where = `datetime(a.created_at) BETWEEN datetime(?) AND datetime(?)`;
  if (employeeId) {
    where += ` AND a.employee_id = ?`;
    params.push(employeeId);
  }
  const summary = query.get<any>(
    `
    SELECT
      COUNT(*) AS total_assignments,
      SUM(CASE WHEN status = 'ASSIGNED' THEN 1 ELSE 0 END) AS assigned_count,
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_count,
      SUM(CASE WHEN status = 'CONFLICT' THEN 1 ELSE 0 END) AS conflict_count
    FROM staff_assignments a
    WHERE ${where}
  `,
    params,
  );

  const avgTime = query.get<any>(
    `
    SELECT AVG((julianday(a.ended_at) - julianday(a.started_at)) * 24 * 60) AS avg_minutes
    FROM staff_assignments a
    WHERE ${where} AND a.started_at IS NOT NULL AND a.ended_at IS NOT NULL
  `,
    params,
  );

  return {
    summary: summary || {},
    avgMinutes: avgTime?.avg_minutes || 0,
  };
}

export async function getShiftReport({
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
    SELECT s.*, e.first_name, e.last_name
    FROM employee_schedules s
    LEFT JOIN employees e ON e.id = s.employee_id
    WHERE datetime(s.schedule_date) BETWEEN datetime(?) AND datetime(?)
    ORDER BY s.schedule_date ASC, s.shift_start ASC
  `,
    [fromIso, toIso],
  );
  return rows;
}

export async function getCrewUtilizationReport({
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
    SELECT e.id as employee_id, e.first_name, e.last_name,
      COALESCE(SUM((julianday(sa.ended_at)-julianday(sa.started_at))*24),0) AS assigned_hours,
      COALESCE(SUM((julianday(s.shift_end)-julianday(s.shift_start))*24),0) AS scheduled_hours
    FROM employees e
    LEFT JOIN staff_assignments sa ON sa.employee_id = e.id AND datetime(sa.created_at) BETWEEN datetime(?) AND datetime(?)
    LEFT JOIN employee_schedules s ON s.employee_id = e.id AND datetime(s.schedule_date) BETWEEN datetime(?) AND datetime(?)
    GROUP BY e.id
  `,
    [fromIso, toIso, fromIso, toIso],
  );
  return rows.map((r) => ({
    ...r,
    assigned_hours: Number(r.assigned_hours || 0),
    scheduled_hours: Number(r.scheduled_hours || 0),
    utilization: r.scheduled_hours
      ? Math.round((r.assigned_hours / r.scheduled_hours) * 100)
      : 0,
  }));
}

export function rowsToCsv(rows: any[]) {
  if (!rows || rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const r of rows) {
    const vals = headers.map((h) => {
      const v = r[h];
      if (v === null || v === undefined) return "";
      const s = typeof v === "object" ? JSON.stringify(v) : String(v);
      return s.includes(",") || s.includes("\n") || s.includes('"')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    });
    lines.push(vals.join(","));
  }
  return lines.join("\n");
}

export default {
  getBookingReport,
  getRevenueReport,
  getOccupancyReport,
  getPassengerManifest,
  getFlightSummary,
  getCancellationReport,
  getRefundReport,
  getPaymentReport,
  getAssignmentReport,
  getStaffPerformanceReport,
  getShiftReport,
  getCrewUtilizationReport,
  rowsToCsv,
};
