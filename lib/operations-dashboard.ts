import { query } from "./db";
import { getSeatOccupancySummary } from "./seats";

function parseJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toNumber(value: any) {
  return Number(value || 0);
}

function recentLimit(value: any, fallback = 10) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(parsed, 50)
    : fallback;
}

export function getOperationsDashboardData(limit = 15) {
  const feedLimit = recentLimit(limit, 15);

  const staffOverview = query.get<any>(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN status = 'ON_LEAVE' THEN 1 ELSE 0 END) AS on_leave,
      SUM(CASE WHEN status = 'SUSPENDED' THEN 1 ELSE 0 END) AS suspended,
      SUM(CASE WHEN status = 'INACTIVE' THEN 1 ELSE 0 END) AS inactive
    FROM employees
  `);
  const staffByRole = query.all<any>(`
    SELECT employee_role AS role, COUNT(*) AS count
    FROM employees
    GROUP BY employee_role
    ORDER BY count DESC, role ASC
  `);
  const staffByDepartment = query.all<any>(`
    SELECT COALESCE(d.name, 'Unassigned') AS department, COUNT(*) AS count
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
    GROUP BY COALESCE(d.name, 'Unassigned')
    ORDER BY count DESC, department ASC
  `);
  const upcomingStaffSchedules = query.all<any>(`
    SELECT s.*, e.first_name, e.last_name, e.employee_number
    FROM employee_schedules s
    JOIN employees e ON e.id = s.employee_id
    WHERE date(s.schedule_date) >= date('now')
    ORDER BY s.schedule_date ASC, s.shift_start ASC
    LIMIT 20
  `);

  const flightStatusBreakdown = query.all<any>(`
    SELECT status, COUNT(*) AS count
    FROM flight_schedules
    GROUP BY status
    ORDER BY count DESC, status ASC
  `);
  const upcomingFlights = query.all<any>(`
    SELECT s.*, f.flight_number, f.origin, f.destination, a.registration AS aircraft_registration, g.gate_code
    FROM flight_schedules s
    LEFT JOIN flights f ON f.id = s.flight_id
    LEFT JOIN aircraft a ON a.id = s.aircraft_id
    LEFT JOIN gates g ON g.id = s.gate_id
    WHERE datetime(s.departure_time) >= datetime('now', '-6 hours')
    ORDER BY s.departure_time ASC
    LIMIT 20
  `);
  const flightUpdates = query.all<any>(
    `
    SELECT u.*, s.flight_id, f.flight_number
    FROM flight_status_updates u
    JOIN flight_schedules s ON s.id = u.schedule_id
    LEFT JOIN flights f ON f.id = s.flight_id
    ORDER BY u.created_at DESC
    LIMIT ?
  `,
    [feedLimit],
  );

  const bookingsOverview = query.get<any>(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmed,
      SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelled,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed
    FROM bookings_v2
  `);
  const bookingCancellations = query.get<any>(`
    SELECT COUNT(*) AS count, COALESCE(SUM(refund_amount), 0) AS refund_total
    FROM booking_cancellations
  `);
  const recentBookings = query.all<any>(
    `
    SELECT booking_ref, flight_id, seat_class, seats, status, created_at
    FROM bookings_v2
    ORDER BY created_at DESC
    LIMIT ?
  `,
    [feedLimit],
  );

  const occupancyFlights = query
    .all<any>(
      `
    SELECT id, flight_number, origin, destination
    FROM flights
    ORDER BY created_at DESC
    LIMIT 20
  `,
    )
    .map((flight) => ({
      ...flight,
      occupancy: getSeatOccupancySummary(flight.id),
    }));

  const revenueOverview = query.get<any>(`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'CAPTURED' THEN amount ELSE 0 END), 0) AS captured,
      COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) AS pending,
      COALESCE(SUM(CASE WHEN status = 'REFUNDED' THEN amount ELSE 0 END), 0) AS refunded,
      COUNT(*) AS total
    FROM payments
  `);
  const revenueByProvider = query.all<any>(`
    SELECT provider, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount
    FROM payments
    GROUP BY provider
    ORDER BY amount DESC, provider ASC
  `);
  const recentPayments = query.all<any>(
    `
    SELECT id, booking_id, amount, currency, provider, status, created_at
    FROM payments
    ORDER BY created_at DESC
    LIMIT ?
  `,
    [feedLimit],
  );

  const assignmentOverview = query.get<any>(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) AS open,
      SUM(CASE WHEN status = 'PENDING_APPROVAL' THEN 1 ELSE 0 END) AS pending_approval,
      SUM(CASE WHEN status = 'ASSIGNED' THEN 1 ELSE 0 END) AS assigned,
      SUM(CASE WHEN status = 'CONFLICT' THEN 1 ELSE 0 END) AS conflict
    FROM staff_assignments
  `);
  const assignmentByRole = query.all<any>(`
    SELECT assignment_role AS role, COUNT(*) AS count
    FROM staff_assignments
    GROUP BY assignment_role
    ORDER BY count DESC, role ASC
  `);
  const openAssignments = query.all<any>(
    `
    SELECT a.*, e.first_name, e.last_name, f.flight_number
    FROM staff_assignments a
    LEFT JOIN employees e ON e.id = a.employee_id
    LEFT JOIN flights f ON f.id = a.flight_id
    WHERE a.status IN ('OPEN', 'PENDING_APPROVAL', 'CONFLICT') OR a.employee_id IS NULL
    ORDER BY a.created_at DESC
    LIMIT ?
  `,
    [feedLimit],
  );
  const assignmentHistory = query.all<any>(
    `
    SELECT h.*, a.assignment_role, a.flight_schedule_id, f.flight_number
    FROM staff_assignment_history h
    JOIN staff_assignments a ON a.id = h.assignment_id
    LEFT JOIN flights f ON f.id = a.flight_id
    ORDER BY h.created_at DESC
    LIMIT ?
  `,
    [feedLimit],
  );

  const feed = [
    ...flightUpdates.map((entry) => ({
      type: "flight_status",
      at: entry.created_at,
      title: `${entry.flight_number || entry.flight_id} status updated to ${entry.status}`,
      detail: entry.reason || entry.note || null,
      meta: entry,
    })),
    ...assignmentHistory.map((entry) => ({
      type: "assignment",
      at: entry.created_at,
      title: `${entry.assignment_role} assignment ${entry.action}`,
      detail: entry.flight_number ? `Flight ${entry.flight_number}` : null,
      meta: entry,
    })),
    ...recentPayments.map((entry) => ({
      type: "payment",
      at: entry.created_at,
      title: `Payment ${entry.status.toLowerCase()} for ${entry.provider}`,
      detail: `${entry.amount} ${entry.currency}`,
      meta: entry,
    })),
    ...recentBookings.map((entry) => ({
      type: "booking",
      at: entry.created_at,
      title: `Booking ${entry.booking_ref} ${entry.status.toLowerCase()}`,
      detail: `${entry.seats} seat(s) • ${entry.seat_class}`,
      meta: entry,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, feedLimit);

  return {
    generatedAt: new Date().toISOString(),
    staff: {
      overview: {
        total: toNumber(staffOverview?.total),
        active: toNumber(staffOverview?.active),
        onLeave: toNumber(staffOverview?.on_leave),
        suspended: toNumber(staffOverview?.suspended),
        inactive: toNumber(staffOverview?.inactive),
      },
      byRole: staffByRole,
      byDepartment: staffByDepartment,
      upcomingSchedules: upcomingStaffSchedules,
    },
    flights: {
      statusBreakdown: flightStatusBreakdown,
      upcoming: upcomingFlights,
    },
    bookings: {
      overview: {
        total: toNumber(bookingsOverview?.total),
        confirmed: toNumber(bookingsOverview?.confirmed),
        cancelled: toNumber(bookingsOverview?.cancelled),
        pending: toNumber(bookingsOverview?.pending),
        completed: toNumber(bookingsOverview?.completed),
      },
      cancellations: {
        count: toNumber(bookingCancellations?.count),
        refundTotal: toNumber(bookingCancellations?.refund_total),
      },
      recent: recentBookings,
    },
    occupancy: {
      flights: occupancyFlights,
      lockedSeats:
        query.get<any>(
          `SELECT COUNT(*) AS count FROM seat_locks WHERE expires_at > CURRENT_TIMESTAMP`,
        )?.count || 0,
    },
    revenue: {
      overview: {
        total: toNumber(revenueOverview?.total),
        captured: toNumber(revenueOverview?.captured),
        pending: toNumber(revenueOverview?.pending),
        refunded: toNumber(revenueOverview?.refunded),
      },
      byProvider: revenueByProvider,
      recent: recentPayments,
    },
    assignments: {
      overview: {
        total: toNumber(assignmentOverview?.total),
        open: toNumber(assignmentOverview?.open),
        pendingApproval: toNumber(assignmentOverview?.pending_approval),
        assigned: toNumber(assignmentOverview?.assigned),
        conflict: toNumber(assignmentOverview?.conflict),
      },
      byRole: assignmentByRole,
      open: openAssignments,
      history: assignmentHistory,
    },
    feed,
  };
}
