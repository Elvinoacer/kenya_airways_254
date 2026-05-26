import { prisma } from "./prisma";

function isoDate(date?: string | Date) {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function generateBookingReport({
  from,
  to,
  format = "json",
}: {
  from?: string;
  to?: string;
  format?: string;
}) {
  const fromIso = isoDate(from) || "1970-01-01T00:00:00.000Z";
  const toIso = isoDate(to) || new Date().toISOString();

  const rows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT 
      b."bookingReference" as booking_reference,
      b."createdAt" as created_at,
      b."status",
      b."totalAmount" as total_amount,
      f."flightNumber" as flight_number,
      f."origin",
      f."destination",
      s."departureTime" as departure_time,
      (SELECT COUNT(*)::int FROM "BookingPassenger" bp WHERE bp."bookingId" = b."id") as passengers_count,
      (SELECT p."status" FROM "Payment" p WHERE p."bookingId" = b."id" ORDER BY p."createdAt" DESC LIMIT 1) as payment_status
    FROM "Booking" b
    JOIN "Flight" f ON b."flightId" = f."id"
    LEFT JOIN "FlightSchedule" s ON s."flightId" = f."id"
    WHERE b."createdAt" >= $1::timestamp AND b."createdAt" <= $2::timestamp
    ORDER BY b."createdAt" DESC
  `, new Date(fromIso), new Date(toIso));

  if (format === "csv") {
    const headers =
      "Booking Ref,Created At,Status,Amount,Flight,Origin,Destination,Departure,Passengers,Payment Status\n";
    const body = rows
      .map(
        (r) =>
          `${r.booking_reference},${r.created_at},${r.status},${r.total_amount},${r.flight_number},${r.origin},${r.destination},${r.departure_time || ""},${r.passengers_count},${r.payment_status || ""}`,
      )
      .join("\n");
    return headers + body;
  }

  return rows;
}

export async function generateRevenueReport({
  from,
  to,
  format = "json",
}: {
  from?: string;
  to?: string;
  format?: string;
}) {
  const fromIso = isoDate(from) || "1970-01-01T00:00:00.000Z";
  const toIso = isoDate(to) || new Date().toISOString();

  const rows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT 
      p."id" as payment_id,
      p."createdAt" as date,
      p."amount",
      p."currency",
      p."provider",
      p."status",
      b."bookingReference" as booking_reference
    FROM "Payment" p
    LEFT JOIN "Booking" b ON p."bookingId" = b."id"
    WHERE p."createdAt" >= $1::timestamp AND p."createdAt" <= $2::timestamp
    ORDER BY p."createdAt" DESC
  `, new Date(fromIso), new Date(toIso));

  if (format === "csv") {
    const headers =
      "Payment ID,Date,Amount,Currency,Provider,Status,Booking Ref\n";
    const body = rows
      .map(
        (r) =>
          `${r.payment_id},${r.date},${r.amount},${r.currency},${r.provider},${r.status},${r.booking_reference || ""}`,
      )
      .join("\n");
    return headers + body;
  }

  return rows;
}

export async function generatePassengerManifest({
  flightId,
  scheduleId,
  format = "json",
}: {
  flightId?: string;
  scheduleId?: string;
  format?: string;
}) {
  // Simple manifest generator for Prisma
  let flightIdQuery = flightId;
  if (!flightIdQuery && scheduleId) {
    const s = await prisma.flightSchedule.findUnique({ where: { id: scheduleId } });
    flightIdQuery = s?.flightId;
  }
  
  if (!flightIdQuery) return format === "csv" ? "" : [];
  
  const passengers = await prisma.bookingPassenger.findMany({
    where: { booking: { flightId: flightIdQuery, status: { not: "CANCELLED" } } },
    include: { booking: true, passenger: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
  });
  
  const mapped = passengers.map((p) => ({
    first_name: p.firstName,
    last_name: p.lastName,
    seat_assignment: p.seatAssignment || "Unassigned",
    booking_reference: p.booking.bookingReference,
    passport_number: p.passenger?.passportNumber || null,
    frequent_flyer: p.passenger?.frequentFlyerNo || null,
  }));
  
  if (format === "csv") {
    const headers = "First Name,Last Name,Seat,Booking Ref,Passport,Frequent Flyer\n";
    const body = mapped
      .map(
        (p) =>
          `${p.first_name},${p.last_name},${p.seat_assignment},${p.booking_reference},${p.passport_number || ""},${p.frequent_flyer || ""}`,
      )
      .join("\n");
    return headers + body;
  }
  
  return mapped;
}

export async function generateFlightPerformanceReport({
  from,
  to,
  format = "json",
}: {
  from?: string;
  to?: string;
  format?: string;
}) {
  const fromIso = isoDate(from) || "1970-01-01T00:00:00.000Z";
  const toIso = isoDate(to) || new Date().toISOString();

  const rows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT 
      f."flightNumber" as flight_number,
      f."origin",
      f."destination",
      s."departureTime" as scheduled_departure,
      s."status",
      (SELECT COUNT(*)::int FROM "FlightStatusUpdate" u WHERE u."scheduleId" = s."id" AND u."status" = 'DELAYED') as delay_updates,
      (SELECT COUNT(*)::int FROM "Booking" b WHERE b."flightId" = f."id" AND b."status" IN ('CONFIRMED','COMPLETED')) as total_bookings
    FROM "FlightSchedule" s
    JOIN "Flight" f ON f."id" = s."flightId"
    WHERE s."departureTime" >= $1::timestamp AND s."departureTime" <= $2::timestamp
    ORDER BY s."departureTime" DESC
  `, new Date(fromIso), new Date(toIso));

  if (format === "csv") {
    const headers = "Flight,Origin,Destination,Scheduled Departure,Status,Delay Updates,Total Bookings\n";
    const body = rows
      .map(
        (r) =>
          `${r.flight_number},${r.origin},${r.destination},${r.scheduled_departure},${r.status},${r.delay_updates},${r.total_bookings}`,
      )
      .join("\n");
    return headers + body;
  }

  return rows;
}

export function rowsToCsv(rows: any[]) {
  if (!rows || rows.length === 0) return "";
  const headers = Object.keys(rows[0]).join(",");
  const body = rows.map(r => Object.values(r).map(v => JSON.stringify(v ?? "")).join(",")).join("\n");
  return headers + "\n" + body;
}

export default {
  getBookingReport: generateBookingReport,
  getRevenueReport: generateRevenueReport,
  getPassengerManifest: generatePassengerManifest,
  getFlightPerformanceReport: generateFlightPerformanceReport,
  generateBookingReport,
  generateRevenueReport,
  generateFlightPerformanceReport,
  getOccupancyReport: async (params: any) => [],
  getFlightSummary: async (params: any) => [],
  getCancellationReport: async (params: any) => [],
  getRefundReport: async (params: any) => [],
  getAssignmentReport: async (params: any) => [],
  getStaffPerformanceReport: async (params: any) => [],
  getShiftReport: async (params: any) => [],
  getCrewUtilizationReport: async (params: any) => [],
  getPaymentReport: async (params: any) => [],
  rowsToCsv
};
