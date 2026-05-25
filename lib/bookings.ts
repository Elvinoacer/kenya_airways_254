import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import {
  cacheGet,
  cacheSet,
  acquireLock,
  releaseLock,
  cacheDel,
} from "./cache";
import { getFlightById } from "./flights";
import type { Booking, Passenger } from "../types/booking";
import { sendEmail, sendSms } from "./notifications";
import { db } from "./db";
import {
  recordPassengerTravelForBooking,
  getPassengerProfilesByIds,
  type PassengerProfile,
} from "./passengers";
import { accessibilityNeedsSummary } from "./accessibility";
import { createRefundForCancellation } from "./refunds";

const BOOKINGS_KEY = (id: string) => `booking:${id}`;
const BOOKING_HISTORY_KEY = (id: string) => `booking_history:${id}`;
const BOOKING_AUDIT_KEY = (id: string) => `booking_audit:${id}`;
const BOOKING_CANCELLATION_KEY = (id: string) => `booking_cancellation:${id}`;
const CANCELLATION_REPORT_KEY = `booking_cancellation_report`;
const HOLD_KEY = (id: string) => `hold:${id}`;
const FLIGHT_HOLDS_KEY = (flightId: string) => `flight_holds:${flightId}`;
const FLIGHT_BOOKED_KEY = (flightId: string) => `flight_booked:${flightId}`;
const DEDUPE_KEY = (hash: string) => `dedupe:${hash}`;

const DEFAULT_HOLD_TTL = Number(process.env.BOOKING_HOLD_TTL || 900); // seconds
const DEFAULT_CANCELLATION_UNDO_WINDOW =
  Number(process.env.BOOKING_CANCELLATION_UNDO_MINUTES || 15) * 60 * 1000;
const DEFAULT_FULL_REFUND_HOURS = Number(
  process.env.BOOKING_CANCELLATION_FULL_REFUND_HOURS || 24,
);
const DEFAULT_PARTIAL_REFUND_HOURS = Number(
  process.env.BOOKING_CANCELLATION_PARTIAL_REFUND_HOURS || 3,
);

type CreateHoldInput = {
  flightId: string;
  seatClass: string;
  seats: number;
  passengers: Passenger[];
  passengerProfileIds?: string[];
  contactEmail?: string;
  contactPhone?: string;
  promoCode?: string;
  userId?: string;
};

function profileToBookingPassenger(profile: PassengerProfile): Passenger {
  const accessibilityNeeds =
    profile.accessibilityNeeds ||
    profile.travelPreferences?.accessibilityNeeds ||
    null;
  return {
    id: profile.id,
    profileId: profile.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    type: "ADULT",
    dob: profile.dateOfBirth || undefined,
    passportNo: profile.passportNo || null,
    nationality: profile.nationality || null,
    phone: profile.phone || null,
    specialAssistance:
      accessibilityNeedsSummary(accessibilityNeeds) ||
      profile.travelPreferences?.specialAssistance ||
      null,
    seatAssignment: null,
    mealPreference: profile.travelPreferences?.mealPreference || null,
    frequentFlyerNumber: profile.frequentFlyerNumber || null,
    travelPreferences: profile.travelPreferences,
    accessibilityNeeds,
    notes: profile.notes || null,
    tags: profile.tags,
    vipLabel: profile.vipLabel || null,
  };
}

type CancelBookingInput = {
  reason: string;
  requestedByRole?: "PASSENGER" | "STAFF" | "ADMIN";
  passengerIds?: string[];
  actor?: string;
  notes?: string;
  forceRefund?: boolean;
};

function computeDedupeKey(input: CreateHoldInput) {
  const h = crypto.createHash("sha256");
  h.update(
    JSON.stringify({
      flightId: input.flightId,
      seatClass: input.seatClass,
      passengers: input.passengers,
      passengerProfileIds: input.passengerProfileIds,
      contactEmail: input.contactEmail,
    }),
  );
  return h.digest("hex");
}

type BookingDbRow = {
  id: string;
  booking_ref: string;
  user_id: string | null;
  flight_id: string;
  seat_class: string;
  seats: number;
  fare_json: string;
  passengers_json: string;
  promo_code: string | null;
  status: string;
  version: number;
  contact_email: string | null;
  contact_phone: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  cancellation_json: string | null;
  status_timeline_json: string | null;
};

function rowToBooking(row: BookingDbRow): Booking {
  const fare = JSON.parse(row.fare_json);
  const passengers = JSON.parse(row.passengers_json);
  return {
    id: row.id,
    reference: row.booking_ref,
    flightId: row.flight_id,
    passengers,
    seatClass: row.seat_class as any,
    seats: row.seats,
    fare,
    promoCode: row.promo_code,
    status: row.status as any,
    expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : null,
    createdAt: new Date(row.created_at).getTime(),
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    version: row.version,
    statusTimeline: row.status_timeline_json
      ? JSON.parse(row.status_timeline_json)
      : [],
    cancellation: row.cancellation_json
      ? JSON.parse(row.cancellation_json)
      : null,
  };
}

function bookingToDbPayload(booking: Booking) {
  return {
    id: booking.id,
    booking_ref: booking.reference,
    flight_id: booking.flightId,
    seat_class: booking.seatClass,
    seats: booking.seats,
    fare_json: JSON.stringify(booking.fare),
    passengers_json: JSON.stringify(booking.passengers),
    promo_code: booking.promoCode ?? null,
    status: booking.status,
    version: booking.version || 1,
    contact_email: booking.contactEmail ?? null,
    contact_phone: booking.contactPhone ?? null,
    expires_at: booking.expiresAt
      ? new Date(booking.expiresAt).toISOString()
      : null,
    cancellation_json: booking.cancellation
      ? JSON.stringify(booking.cancellation)
      : null,
    status_timeline_json: booking.statusTimeline
      ? JSON.stringify(booking.statusTimeline)
      : JSON.stringify([]),
  };
}

function withTransaction<T>(fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function persistBooking(booking: Booking) {
  const payload = bookingToDbPayload(booking);
  db.prepare(
    `
    INSERT INTO bookings_v2 (
      id, booking_ref, flight_id, seat_class, seats, fare_json, passengers_json, promo_code,
      status, version, contact_email, contact_phone, expires_at, created_at, updated_at,
      cancellation_json, status_timeline_json
    ) VALUES (
      @id, @booking_ref, @flight_id, @seat_class, @seats, @fare_json, @passengers_json, @promo_code,
      @status, @version, @contact_email, @contact_phone, @expires_at, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
      @cancellation_json, @status_timeline_json
    )
    ON CONFLICT(id) DO UPDATE SET
      booking_ref=excluded.booking_ref,
      flight_id=excluded.flight_id,
      seat_class=excluded.seat_class,
      seats=excluded.seats,
      fare_json=excluded.fare_json,
      passengers_json=excluded.passengers_json,
      promo_code=excluded.promo_code,
      status=excluded.status,
      version=excluded.version,
      contact_email=excluded.contact_email,
      contact_phone=excluded.contact_phone,
      expires_at=excluded.expires_at,
      updated_at=CURRENT_TIMESTAMP,
      cancellation_json=excluded.cancellation_json,
      status_timeline_json=excluded.status_timeline_json
  `,
  ).run(payload as any);
}

function persistPassengers(booking: Booking) {
  const deleteStmt = db.prepare(
    `DELETE FROM booking_passengers_v2 WHERE booking_id = ?`,
  );
  const insertStmt = db.prepare(`
    INSERT INTO booking_passengers_v2 (
      id, booking_id, passenger_id, first_name, last_name, passenger_type,
      dob, special_assistance, seat_assignment, meal_preference, is_cancelled
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  deleteStmt.run(booking.id);
  for (const passenger of booking.passengers) {
    insertStmt.run(
      uuidv4(),
      booking.id,
      passenger.id,
      passenger.firstName,
      passenger.lastName,
      passenger.type,
      passenger.dob || null,
      passenger.specialAssistance ||
        accessibilityNeedsSummary(passenger.accessibilityNeeds || null) ||
        null,
      passenger.seatAssignment || null,
      passenger.mealPreference || null,
      0,
    );
  }
}

function saveSnapshot(booking: Booking, reason?: string, actor?: string) {
  db.prepare(
    `
    INSERT INTO booking_snapshots_v2 (
      id, booking_id, version, snapshot_json, reason, actor
    ) VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run(
    uuidv4(),
    booking.id,
    booking.version || 1,
    JSON.stringify(booking),
    reason || null,
    actor || null,
  );
}

function saveAudit(
  bookingId: string,
  action: string,
  details?: any,
  actor?: string,
) {
  db.prepare(
    `
    INSERT INTO booking_audit_v2 (
      id, booking_id, action, details_json, actor
    ) VALUES (?, ?, ?, ?, ?)
  `,
  ).run(
    uuidv4(),
    bookingId,
    action,
    details ? JSON.stringify(details) : null,
    actor || null,
  );
}

function saveTimeline(booking: Booking) {
  const timeline = booking.statusTimeline || [];
  const existing = db
    .prepare(`DELETE FROM booking_timeline_v2 WHERE booking_id = ?`)
    .run(booking.id);
  void existing;
  const stmt = db.prepare(`
    INSERT INTO booking_timeline_v2 (
      id, booking_id, status, description
    ) VALUES (?, ?, ?, ?)
  `);
  for (const item of timeline) {
    stmt.run(uuidv4(), booking.id, item.status, item.note || item.status);
  }
}

function loadBooking(bookingId: string): Booking | null {
  const row = db
    .prepare(`SELECT * FROM bookings_v2 WHERE id = ?`)
    .get(bookingId) as BookingDbRow | undefined;
  return row ? rowToBooking(row) : null;
}

function loadBookingHistory(bookingId: string) {
  const rows = db
    .prepare(
      `SELECT * FROM booking_snapshots_v2 WHERE booking_id = ? ORDER BY version ASC`,
    )
    .all(bookingId) as any[];
  return rows.map((row) => ({
    version: row.version,
    snapshot: JSON.parse(row.snapshot_json),
    reason: row.reason,
    actor: row.actor,
    at: new Date(row.created_at).getTime(),
  }));
}

function loadBookingAudit(bookingId: string) {
  const rows = db
    .prepare(
      `SELECT * FROM booking_audit_v2 WHERE booking_id = ? ORDER BY created_at ASC`,
    )
    .all(bookingId) as any[];
  return rows.map((row) => ({
    action: row.action,
    details: row.details_json ? JSON.parse(row.details_json) : null,
    actor: row.actor,
    at: new Date(row.created_at).getTime(),
  }));
}

function loadCancellation(bookingId: string) {
  return db
    .prepare(`SELECT * FROM booking_cancellations WHERE booking_id = ?`)
    .get(bookingId) as any | undefined;
}

async function getFlightCounts(flightId: string) {
  const flight = getFlightById(flightId);
  if (!flight) return null;
  const booked = (await cacheGet(FLIGHT_BOOKED_KEY(flightId))) || {};
  const holds = (await cacheGet(FLIGHT_HOLDS_KEY(flightId))) || {};
  return { flight, booked, holds };
}

export function calculateFare(
  basePrice: number,
  seats: number,
  promoCode?: string,
) {
  const baseFare = Math.round(basePrice * seats * 100) / 100;
  const serviceFee = Math.round(baseFare * 0.03 * 100) / 100; // 3%
  const taxRate = Number(process.env.FLIGHT_TAX_RATE || 0.16);
  const taxes = Math.round(baseFare * taxRate * 100) / 100;
  const fees = 10 * seats; // flat 10 USD per passenger airport/service fee
  let discount = 0;
  // simple promo logic
  if (promoCode) {
    if (promoCode === "PROMO10")
      discount = Math.round(baseFare * 0.1 * 100) / 100;
    else if (promoCode === "PROMO50") discount = 50;
  }
  const total =
    Math.round((baseFare + serviceFee + taxes + fees - discount) * 100) / 100;
  return { baseFare, taxes: taxes + serviceFee, fees, discount, total };
}

export async function createHold(input: CreateHoldInput) {
  // dedupe prevention
  const dedupe = computeDedupeKey(input);
  const existing = await cacheGet(DEDUPE_KEY(dedupe));
  if (existing) return { duplicate: true, existing };

  let resolvedPassengers = input.passengers || [];
  if (
    (!resolvedPassengers || resolvedPassengers.length === 0) &&
    input.passengerProfileIds?.length
  ) {
    const profiles = getPassengerProfilesByIds(input.passengerProfileIds);
    if (!profiles.length)
      throw new Error("No saved passengers found for the selected profiles");
    resolvedPassengers = profiles.map(profileToBookingPassenger);
  }

  if (!resolvedPassengers.length) {
    throw new Error("At least one passenger is required for booking creation");
  }

  if (input.seats && resolvedPassengers.length !== input.seats) {
    throw new Error("Passenger count must match seats requested");
  }

  const lockKey = `lock:flight:${input.flightId}`;
  const token = await acquireLock(lockKey, 5000);
  if (!token) throw new Error("Could not acquire lock, try again");

  try {
    const counts = await getFlightCounts(input.flightId);
    if (!counts) throw new Error("Flight not found");
    const { flight, booked, holds } = counts;
    const available =
      (flight.seatsAvailable as any)[input.seatClass] -
      ((booked as any)[input.seatClass] || 0) -
      ((holds as any)[input.seatClass] || 0);
    if (available < input.seats) throw new Error("Not enough seats available");

    // create hold
    const holdId = uuidv4();
    const expiresAt = Date.now() + DEFAULT_HOLD_TTL * 1000;
    const basePrice = flight.basePrice;
    const fare = calculateFare(basePrice, input.seats, input.promoCode);

    const hold = {
      id: holdId,
      flightId: input.flightId,
      seatClass: input.seatClass,
      seats: input.seats,
      passengers: resolvedPassengers,
      promoCode: input.promoCode,
      fare,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      expiresAt,
      createdAt: Date.now(),
    };

    // update flight holds counts
    const newHolds = { ...(holds || {}) };
    newHolds[input.seatClass] =
      ((newHolds as any)[input.seatClass] || 0) + input.seats;
    await cacheSet(
      FLIGHT_HOLDS_KEY(input.flightId),
      newHolds,
      DEFAULT_HOLD_TTL + 60,
    );
    await cacheSet(HOLD_KEY(holdId), hold, DEFAULT_HOLD_TTL);
    // store dedupe reference for short time
    await cacheSet(DEDUPE_KEY(dedupe), { holdId, createdAt: Date.now() }, 300);

    return { holdId, expiresAt, fare, hold };
  } finally {
    await releaseLock(lockKey, token);
  }
}

export async function confirmBooking(holdId: string, paymentInfo?: any) {
  const hold = await cacheGet(HOLD_KEY(holdId));
  if (!hold) throw new Error("Hold not found or expired");
  if (Date.now() > hold.expiresAt) {
    // cleanup
    await cacheDel(HOLD_KEY(holdId));
    throw new Error("Hold expired");
  }

  const lockKey = `lock:flight:${hold.flightId}`;
  const token = await acquireLock(lockKey, 5000);
  if (!token) throw new Error("Could not acquire lock to confirm booking");

  try {
    // finalize - increment booked counts and remove holds
    const booked = (await cacheGet(FLIGHT_BOOKED_KEY(hold.flightId))) || {};
    const holds = (await cacheGet(FLIGHT_HOLDS_KEY(hold.flightId))) || {};
    // ensure held seats exist
    if (((holds as any)[hold.seatClass] || 0) < hold.seats)
      throw new Error("Hold inconsistency");

    booked[hold.seatClass] =
      ((booked as any)[hold.seatClass] || 0) + hold.seats;
    holds[hold.seatClass] = Math.max(
      0,
      ((holds as any)[hold.seatClass] || 0) - hold.seats,
    );

    await cacheSet(FLIGHT_BOOKED_KEY(hold.flightId), booked, 60 * 60 * 24 * 30);
    await cacheSet(FLIGHT_HOLDS_KEY(hold.flightId), holds, 60 * 60 * 24);
    await cacheDel(HOLD_KEY(holdId));

    // create durable booking record
    const bookingId = uuidv4();
    const reference = generateReference();
    const booking: Booking = {
      id: bookingId,
      reference,
      flightId: hold.flightId,
      passengers: hold.passengers,
      seatClass: hold.seatClass,
      seats: hold.seats,
      fare: hold.fare,
      promoCode: hold.promoCode,
      status: "CONFIRMED",
      expiresAt: null,
      createdAt: Date.now(),
      contactEmail: hold.contactEmail,
      contactPhone: hold.contactPhone,
      version: 1,
      statusTimeline: [
        { status: "CONFIRMED", at: Date.now(), note: "booking confirmed" },
      ],
      cancellation: null,
    } as Booking;

    withTransaction(() => {
      persistBooking(booking);
      persistPassengers(booking);
      saveSnapshot(booking, "booking.confirmed", paymentInfo?.actor);
      saveAudit(
        booking.id,
        "booking.confirmed",
        { holdId, paymentInfo },
        paymentInfo?.actor,
      );
      saveTimeline(booking);
    });
    recordPassengerTravelForBooking(booking, "BOOKED", paymentInfo?.actor);

    // send notifications (async)
    if (booking.contactEmail) {
      sendEmail(
        booking.contactEmail,
        `Booking confirmed ${booking.reference}`,
        `Your booking reference is ${booking.reference}`,
      );
    }
    if (booking.contactPhone) {
      sendSms(booking.contactPhone, `Booking confirmed ${booking.reference}`);
    }

    return { booking, receipt: generateReceipt(booking) };
  } finally {
    await releaseLock(lockKey, token);
  }
}

export async function getBooking(id: string) {
  return loadBooking(id);
}

async function appendHistory(
  booking: Booking,
  reason?: string,
  actor?: string,
) {
  booking.version = (booking.version || 0) + 1;
  saveSnapshot(booking, reason, actor);
  saveAudit(booking.id, "history.snapshot", { reason }, actor);
}

async function appendAudit(
  bookingId: string,
  action: string,
  details?: any,
  actor?: string,
) {
  saveAudit(bookingId, action, details, actor);
}

function hoursUntilDeparture(booking: Booking) {
  const flight = getFlightById(booking.flightId);
  if (!flight) return 0;
  return (new Date(flight.departAt).getTime() - Date.now()) / (60 * 60 * 1000);
}

function computeCancelRefund(
  booking: Booking,
  cancelledSeats: number,
  forceRefund?: boolean,
) {
  const flight = getFlightById(booking.flightId);
  if (!flight) {
    return {
      refundEligible: false,
      refundAmount: 0,
      refundPolicy: "flight-not-found",
    };
  }
  const seatRatio = Math.max(
    0,
    Math.min(1, cancelledSeats / Math.max(1, booking.seats)),
  );
  const proratedTotal = Math.round(booking.fare.total * seatRatio * 100) / 100;
  const hours = hoursUntilDeparture(booking);
  let rate = 0;
  let policy = "non-refundable";
  if (forceRefund) {
    rate = 1;
    policy = "forced-refund";
  } else if (hours >= DEFAULT_FULL_REFUND_HOURS) {
    rate = 1;
    policy = `full-refund>=${DEFAULT_FULL_REFUND_HOURS}h`;
  } else if (hours >= DEFAULT_PARTIAL_REFUND_HOURS) {
    rate = 0.5;
    policy = `partial-refund>=${DEFAULT_PARTIAL_REFUND_HOURS}h`;
  }
  const refundAmount = Math.round(proratedTotal * rate * 100) / 100;
  return {
    refundEligible: refundAmount > 0,
    refundAmount,
    refundPolicy: policy,
  };
}

export async function previewCancellation(
  bookingId: string,
  passengerIds?: string[],
  forceRefund?: boolean,
) {
  const booking: Booking | null = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  const cancelledPassengerIds =
    passengerIds && passengerIds.length
      ? passengerIds
      : booking.passengers.map((p) => p.id);
  const cancelledSeats = booking.passengers.filter((p) =>
    cancelledPassengerIds.includes(p.id),
  ).length;
  const partial = cancelledSeats < booking.seats;
  const refund = computeCancelRefund(booking, cancelledSeats, forceRefund);
  return {
    bookingId,
    reference: booking.reference,
    partial,
    cancelledSeats,
    cancelledPassengerIds,
    refundEligible: refund.refundEligible,
    refundAmount: refund.refundAmount,
    refundPolicy: refund.refundPolicy,
    undoWindowMinutes: Number(
      process.env.BOOKING_CANCELLATION_UNDO_MINUTES || 15,
    ),
  };
}

function pushStatusTimeline(booking: Booking, status: string, note?: string) {
  const timeline = booking.statusTimeline || [];
  timeline.push({ status, at: Date.now(), note });
  booking.statusTimeline = timeline;
}

async function appendCancellationReport(entry: any) {
  db.prepare(
    `
    INSERT INTO booking_reports (
      id, booking_id, reference, report_type, reason, cancelled_seats,
      refund_eligible, refund_amount, partial, role, payload
    ) VALUES (?, ?, ?, 'CANCELLATION', ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    uuidv4(),
    entry.bookingId,
    entry.reference,
    entry.reason,
    entry.cancelledSeats,
    entry.refundEligible ? 1 : 0,
    entry.refundAmount,
    entry.partial ? 1 : 0,
    entry.role || null,
    JSON.stringify(entry),
  );
}

export async function getBookingHistory(bookingId: string) {
  return loadBookingHistory(bookingId);
}

export async function getBookingAudit(bookingId: string) {
  return loadBookingAudit(bookingId);
}

export async function getCancellationReport() {
  const rows = db
    .prepare(
      `SELECT * FROM booking_reports WHERE report_type = 'CANCELLATION' ORDER BY created_at DESC`,
    )
    .all() as any[];
  return rows.map((row) => ({
    bookingId: row.booking_id,
    reference: row.reference,
    reason: row.reason,
    cancelledSeats: row.cancelled_seats,
    refundEligible: Boolean(row.refund_eligible),
    refundAmount: row.refund_amount,
    partial: Boolean(row.partial),
    role: row.role,
    at: new Date(row.created_at).getTime(),
    payload: row.payload ? JSON.parse(row.payload) : null,
  }));
}

export async function cancelBooking(
  bookingId: string,
  input: CancelBookingInput,
) {
  const booking: Booking | null = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  if (booking.status !== "CONFIRMED")
    throw new Error("Only confirmed bookings can be cancelled");
  if (booking.cancellation?.cancelledAt)
    throw new Error("Booking is already cancelled");

  const lockKeys = new Set<string>([
    `lock:booking:${bookingId}`,
    `lock:flight:${booking.flightId}`,
  ]);
  const keys = Array.from(lockKeys).sort();
  const tokens: Record<string, string | null> = {};
  for (const k of keys) {
    const t = await acquireLock(k, 5000);
    if (!t) {
      for (const kk of Object.keys(tokens))
        if (tokens[kk]) await releaseLock(kk, tokens[kk] as string);
      throw new Error("Could not acquire locks for cancellation");
    }
    tokens[k] = t;
  }

  try {
    const flight = getFlightById(booking.flightId);
    if (!flight) throw new Error("Flight not found");

    const cancelledPassengerIds =
      input.passengerIds && input.passengerIds.length
        ? input.passengerIds
        : booking.passengers.map((p) => p.id);
    const uniquePassengerIds = Array.from(new Set(cancelledPassengerIds));
    const cancelledPassengers = booking.passengers.filter((p) =>
      uniquePassengerIds.includes(p.id),
    );
    if (!cancelledPassengers.length)
      throw new Error("No matching passengers to cancel");

    const cancelledSeats = cancelledPassengers.length;
    const partial = cancelledSeats < booking.seats;

    const refund = computeCancelRefund(
      booking,
      cancelledSeats,
      input.forceRefund,
    );

    // release seats back to inventory
    const booked = (await cacheGet(FLIGHT_BOOKED_KEY(booking.flightId))) || {};
    booked[booking.seatClass] = Math.max(
      0,
      ((booked as any)[booking.seatClass] || 0) - cancelledSeats,
    );
    await cacheSet(
      FLIGHT_BOOKED_KEY(booking.flightId),
      booked,
      60 * 60 * 24 * 30,
    );

    const cancellationId = uuidv4();
    const undoUntil = Date.now() + DEFAULT_CANCELLATION_UNDO_WINDOW;
    const cancellation = {
      id: cancellationId,
      bookingId,
      reason: input.reason,
      requestedByRole: input.requestedByRole,
      cancelledPassengerIds: uniquePassengerIds,
      cancelledSeats,
      partial,
      refundEligible: refund.refundEligible,
      refundAmount: refund.refundAmount,
      refundPolicy: refund.refundPolicy,
      cancelledAt: Date.now(),
      undoUntil,
      actor: input.actor || null,
      notes: input.notes || null,
    };

    const cancelledAtIso = new Date(cancellation.cancelledAt).toISOString();

    const remainingPassengers = booking.passengers.filter(
      (p) => !uniquePassengerIds.includes(p.id),
    );
    booking.passengers = remainingPassengers;
    booking.seats = remainingPassengers.length;
    if (booking.seats <= 0) {
      booking.status = "CANCELLED";
      booking.expiresAt = null;
    }
    booking.cancellation = cancellation as any;
    pushStatusTimeline(
      booking,
      booking.status,
      partial ? "partial cancellation" : "full cancellation",
    );
    booking.version = (booking.version || 0) + 1;

    await appendHistory({ ...booking }, "cancel.start", input.actor);
    withTransaction(() => {
      persistBooking(booking);
      persistPassengers(booking);
      saveSnapshot(booking, "booking.cancelled", input.actor);
      db.prepare(
        `
        INSERT INTO booking_cancellations (
          id, booking_id, reason, requested_by_role, cancelled_passenger_ids,
          cancelled_seats, partial, refund_eligible, refund_amount, refund_policy,
          cancelled_at, undo_until, undone_at, actor, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(booking_id) DO UPDATE SET
          reason=excluded.reason,
          requested_by_role=excluded.requested_by_role,
          cancelled_passenger_ids=excluded.cancelled_passenger_ids,
          cancelled_seats=excluded.cancelled_seats,
          partial=excluded.partial,
          refund_eligible=excluded.refund_eligible,
          refund_amount=excluded.refund_amount,
          refund_policy=excluded.refund_policy,
          cancelled_at=excluded.cancelled_at,
          undo_until=excluded.undo_until,
          undone_at=excluded.undone_at,
          actor=excluded.actor,
          notes=excluded.notes
      `,
      ).run(
        cancellation.id,
        booking.id,
        cancellation.reason,
        cancellation.requestedByRole || null,
        JSON.stringify(cancellation.cancelledPassengerIds),
        cancellation.cancelledSeats,
        cancellation.partial ? 1 : 0,
        cancellation.refundEligible ? 1 : 0,
        cancellation.refundAmount,
        cancellation.refundPolicy,
        cancelledAtIso,
        cancellation.undoUntil
          ? new Date(cancellation.undoUntil).toISOString()
          : null,
        null,
        cancellation.actor,
        cancellation.notes,
      );
      db.prepare(
        `
        INSERT INTO booking_reports (
          id, booking_id, reference, report_type, reason, cancelled_seats,
          refund_eligible, refund_amount, partial, role, payload
        ) VALUES (?, ?, ?, 'CANCELLATION', ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        uuidv4(),
        booking.id,
        booking.reference,
        input.reason,
        cancelledSeats,
        refund.refundEligible ? 1 : 0,
        refund.refundAmount,
        partial ? 1 : 0,
        input.requestedByRole || null,
        JSON.stringify({ booking, cancellation, refund, action: "cancel" }),
      );
    });
    recordPassengerTravelForBooking(booking, "CANCELLED", input.actor);
    const refundRequest = refund.refundEligible
      ? await createRefundForCancellation({
          bookingId: booking.id,
          bookingReference: booking.reference,
          amount: refund.refundAmount,
          currency: "KES",
          reason: input.reason,
          partial,
          requestedByRole: input.requestedByRole,
          actor: input.actor,
          contactEmail: booking.contactEmail,
          contactPhone: booking.contactPhone,
          notes: input.notes,
        })
      : null;
    await appendAudit(
      bookingId,
      "booking.cancel",
      {
        reason: input.reason,
        cancelledSeats,
        partial,
        refund: refund.refundAmount,
        refundPolicy: refund.refundPolicy,
        refundRequest,
        actor: input.actor,
      },
      input.actor,
    );

    if (booking.contactEmail) {
      sendEmail(
        booking.contactEmail,
        `Booking cancelled ${booking.reference}`,
        `Your booking was cancelled. Refund eligible: ${refund.refundEligible ? "yes" : "no"}${refund.refundAmount ? `, amount: ${refund.refundAmount}` : ""}`,
      );
    }
    if (booking.contactPhone) {
      sendSms(
        booking.contactPhone,
        `Booking cancelled ${booking.reference}. Refund ${refund.refundEligible ? "eligible" : "not eligible"}`,
      );
    }

    return { booking, cancellation, refund, refundRequest };
  } finally {
    for (const k of Object.keys(tokens))
      if (tokens[k]) await releaseLock(k, tokens[k] as string);
  }
}

export async function undoCancellation(bookingId: string, actor?: string) {
  const booking: Booking | null = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");
  const cancellationRow = loadCancellation(bookingId);
  const cancellation = cancellationRow
    ? {
        ...cancellationRow,
        cancelledPassengerIds: JSON.parse(
          cancellationRow.cancelled_passenger_ids,
        ),
        partial: Boolean(cancellationRow.partial),
        refundEligible: Boolean(cancellationRow.refund_eligible),
        refundAmount: cancellationRow.refund_amount,
        undoUntil: cancellationRow.undo_until
          ? new Date(cancellationRow.undo_until).getTime()
          : null,
        cancelledAt: new Date(cancellationRow.cancelled_at).getTime(),
      }
    : null;
  if (!cancellation) throw new Error("No cancellation record found");
  if (cancellation.undoneAt || cancellationRow?.undone_at)
    throw new Error("Cancellation already undone");
  if (Date.now() > (cancellation.undoUntil || 0))
    throw new Error("Undo window expired");

  const lockKeys = new Set<string>([
    `lock:booking:${bookingId}`,
    `lock:flight:${booking.flightId}`,
  ]);
  const keys = Array.from(lockKeys).sort();
  const tokens: Record<string, string | null> = {};
  for (const k of keys) {
    const t = await acquireLock(k, 5000);
    if (!t) {
      for (const kk of Object.keys(tokens))
        if (tokens[kk]) await releaseLock(kk, tokens[kk] as string);
      throw new Error("Could not acquire locks for undo cancellation");
    }
    tokens[k] = t;
  }

  try {
    const flight = getFlightById(booking.flightId);
    if (!flight) throw new Error("Flight not found");

    const booked = (await cacheGet(FLIGHT_BOOKED_KEY(booking.flightId))) || {};
    booked[booking.seatClass] =
      ((booked as any)[booking.seatClass] || 0) + cancellation.cancelledSeats;
    await cacheSet(
      FLIGHT_BOOKED_KEY(booking.flightId),
      booked,
      60 * 60 * 24 * 30,
    );

    // restore passengers from the cancellation snapshot is non-trivial; use the current stored booking snapshot to preserve remaining passengers, and append placeholders if needed.
    // We can only safely restore the previously cancelled passengers if they were kept in cancellation.cancelledPassengerIds; here we rebuild from audit snapshot if available.
    const history = (await getBookingHistory(bookingId)) as any[];
    const latestBeforeCancel = [...history]
      .reverse()
      .find((h) => h?.snapshot?.status === "CONFIRMED");
    let restoredPassengers = booking.passengers;
    if (latestBeforeCancel?.snapshot?.passengers?.length) {
      restoredPassengers = latestBeforeCancel.snapshot.passengers;
    }
    booking.passengers = restoredPassengers;
    booking.seats = restoredPassengers.length;
    booking.status = "CONFIRMED";
    pushStatusTimeline(booking, "CONFIRMED", "cancellation undone");
    booking.version = (booking.version || 0) + 1;
    booking.cancellation = { ...cancellation, undoneAt: Date.now() };

    await appendHistory({ ...booking }, "cancel.undo", actor);
    withTransaction(() => {
      persistBooking(booking);
      persistPassengers(booking);
      saveSnapshot(booking, "booking.undo_cancellation", actor);
      db.prepare(
        `UPDATE booking_cancellations SET undone_at = ?, notes = COALESCE(notes, '') WHERE booking_id = ?`,
      ).run(new Date().toISOString(), bookingId);
      db.prepare(
        `
        INSERT INTO booking_reports (
          id, booking_id, reference, report_type, reason, cancelled_seats,
          refund_eligible, refund_amount, partial, role, payload
        ) VALUES (?, ?, ?, 'CANCELLATION', ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        uuidv4(),
        booking.id,
        booking.reference,
        "undo-cancellation",
        cancellation.cancelledSeats,
        0,
        0,
        cancellation.partial ? 1 : 0,
        cancellation.requestedByRole || null,
        JSON.stringify({ booking, cancellation, action: "undo" }),
      );
    });
    recordPassengerTravelForBooking(booking, "UNDO_CANCEL", actor);
    await appendAudit(bookingId, "booking.cancel.undo", { actor }, actor);

    return { booking, cancellation: booking.cancellation };
  } finally {
    for (const k of Object.keys(tokens))
      if (tokens[k]) await releaseLock(k, tokens[k] as string);
  }
}

// helpers to modify booking safely with locks
export async function modifyBooking(
  bookingId: string,
  changes: any,
  actor?: string,
) {
  const booking: Booking | null = await getBooking(bookingId);
  if (!booking) throw new Error("Booking not found");

  // lock booking and affected flights
  const lockKeys = new Set<string>();
  lockKeys.add(`lock:booking:${bookingId}`);
  lockKeys.add(`lock:flight:${booking.flightId}`);
  if (changes.flightId) lockKeys.add(`lock:flight:${changes.flightId}`);

  // acquire locks in stable order
  const keys = Array.from(lockKeys).sort();
  const tokens: Record<string, string | null> = {};
  for (const k of keys) {
    const t = await acquireLock(k, 5000);
    if (!t) {
      // release previously acquired
      for (const kk of Object.keys(tokens))
        if (tokens[kk]) await releaseLock(kk, tokens[kk] as string);
      throw new Error("Could not acquire locks for modification");
    }
    tokens[k] = t;
  }

  try {
    // snapshot
    await appendHistory({ ...booking }, `modify.start`, actor);

    // support changes: flightId, departAt (via flight change), seatClass, seats, passengers modifications, extras
    let priceDelta = 0;

    // If changing flight
    if (changes.flightId && changes.flightId !== booking.flightId) {
      const fromFlight = getFlightById(booking.flightId);
      const toFlight = getFlightById(changes.flightId);
      if (!toFlight) throw new Error("Target flight not found");

      // check availability on target
      const bookedTo =
        (await cacheGet(FLIGHT_BOOKED_KEY(changes.flightId))) || {};
      const holdsTo =
        (await cacheGet(FLIGHT_HOLDS_KEY(changes.flightId))) || {};
      const availableTo =
        (toFlight.seatsAvailable as any)[booking.seatClass] -
        ((bookedTo as any)[booking.seatClass] || 0) -
        ((holdsTo as any)[booking.seatClass] || 0);
      if (availableTo < booking.seats)
        throw new Error("Not enough seats on target flight");

      // decrement booked on old flight
      const bookedFrom =
        (await cacheGet(FLIGHT_BOOKED_KEY(booking.flightId))) || {};
      bookedFrom[booking.seatClass] = Math.max(
        0,
        ((bookedFrom as any)[booking.seatClass] || 0) - booking.seats,
      );
      await cacheSet(
        FLIGHT_BOOKED_KEY(booking.flightId),
        bookedFrom,
        60 * 60 * 24 * 30,
      );

      // increment booked on new flight
      bookedTo[booking.seatClass] =
        ((bookedTo as any)[booking.seatClass] || 0) + booking.seats;
      await cacheSet(
        FLIGHT_BOOKED_KEY(changes.flightId),
        bookedTo,
        60 * 60 * 24 * 30,
      );

      booking.flightId = changes.flightId;
      await appendAudit(
        bookingId,
        "change.flight",
        { from: booking.flightId, to: changes.flightId },
        actor,
      );
    }

    // Seat class change (upgrade/downgrade)
    if (changes.seatClass && changes.seatClass !== booking.seatClass) {
      // check availability in same flight
      const flight = getFlightById(booking.flightId);
      if (!flight) throw new Error("Flight not found");
      const booked =
        (await cacheGet(FLIGHT_BOOKED_KEY(booking.flightId))) || {};
      const holds = (await cacheGet(FLIGHT_HOLDS_KEY(booking.flightId))) || {};
      const available =
        (flight.seatsAvailable as any)[changes.seatClass] -
        ((booked as any)[changes.seatClass] || 0) -
        ((holds as any)[changes.seatClass] || 0);
      if (available < booking.seats)
        throw new Error("Not enough seats in requested class");

      // adjust booked counts
      booked[booking.seatClass] = Math.max(
        0,
        ((booked as any)[booking.seatClass] || 0) - booking.seats,
      );
      booked[changes.seatClass] =
        ((booked as any)[changes.seatClass] || 0) + booking.seats;
      await cacheSet(
        FLIGHT_BOOKED_KEY(booking.flightId),
        booked,
        60 * 60 * 24 * 30,
      );

      const oldClass = booking.seatClass;
      booking.seatClass = changes.seatClass;
      await appendAudit(
        bookingId,
        "change.seatClass",
        { from: oldClass, to: changes.seatClass },
        actor,
      );
    }

    // passenger modifications
    if (changes.passengers) {
      booking.passengers = changes.passengers;
      booking.seats = booking.passengers.length;
      await appendAudit(
        bookingId,
        "change.passengers",
        { passengers: changes.passengers },
        actor,
      );
    }

    // extras: baggage, meals
    if (changes.extras) {
      // adjust fare: simple per-baggage charge and meal charge
      const baggageCount = changes.extras.baggage || 0;
      const meal = changes.extras.meal ? 5 * booking.seats : 0;
      const baggageFee = 25 * baggageCount; // USD flat
      booking.fare.fees =
        Math.round((booking.fare.fees + baggageFee + meal) * 100) / 100;
      booking.fare.total =
        Math.round((booking.fare.total + baggageFee + meal) * 100) / 100;
      await appendAudit(
        bookingId,
        "change.extras",
        { extras: changes.extras },
        actor,
      );
    }

    // repricing requested
    if (changes.reprice) {
      const flight = getFlightById(booking.flightId);
      if (!flight) throw new Error("Flight not found");
      const newFare = calculateFare(
        flight.basePrice,
        booking.seats,
        booking.promoCode ?? undefined,
      );
      const delta =
        Math.round((newFare.total - booking.fare.total) * 100) / 100;
      booking.fare = newFare as any;
      await appendAudit(bookingId, "change.reprice", { delta }, actor);
      priceDelta = delta;
    }

    // modify contact
    if (changes.contactEmail) booking.contactEmail = changes.contactEmail;
    if (changes.contactPhone) booking.contactPhone = changes.contactPhone;

    // push status timeline update
    const timeline = booking.statusTimeline || [];
    timeline.push({ status: booking.status, at: Date.now(), note: "modified" });
    booking.statusTimeline = timeline;

    // persist booking
    await appendHistory({ ...booking }, "modify.commit", actor);
    withTransaction(() => {
      persistBooking(booking);
      persistPassengers(booking);
      saveTimeline(booking);
      saveSnapshot(booking, "booking.modified", actor);
      saveAudit(bookingId, "booking.modified.persisted", { changes }, actor);
    });
    recordPassengerTravelForBooking(booking, "MODIFIED", actor);

    return { booking, priceDelta };
  } finally {
    // release locks
    for (const k of Object.keys(tokens))
      if (tokens[k]) await releaseLock(k, tokens[k] as string);
  }
}

function generateReference() {
  const prefix = process.env.BOOKING_PREFIX || "KA";
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}${Date.now().toString(36).toUpperCase()}${rand}`;
}

function generateReceipt(booking: Booking) {
  return {
    id: booking.id,
    reference: booking.reference,
    flightId: booking.flightId,
    passengers: booking.passengers.map((p) => `${p.firstName} ${p.lastName}`),
    fare: booking.fare,
    issuedAt: new Date().toISOString(),
  };
}
