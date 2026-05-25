import { query } from "./db";
import realtime from "./realtime";

export function getSeatsForFlight(flightId: string) {
  return query.all(
    `SELECT s.*, m.is_emergency_exit, m.is_accessible, m.price_modifier, m.preference_tags FROM seats s LEFT JOIN seats_meta m ON m.seat_id = s.id WHERE s.flight_id = ? ORDER BY seat_class, seat_number`,
    [flightId],
  );
}

export function getSeatOccupancySummary(flightId: string) {
  const total = query.get(
    `SELECT COUNT(*) as c FROM seats WHERE flight_id = ?`,
    [flightId],
  ) as any;
  const occupied = query.get(
    `SELECT COUNT(*) as c FROM seats WHERE flight_id = ? AND is_occupied = 1`,
    [flightId],
  ) as any;
  const locked = query.get(
    `SELECT COUNT(*) as c FROM seat_locks WHERE flight_id = ? AND expires_at > CURRENT_TIMESTAMP`,
    [flightId],
  ) as any;
  return {
    total: total?.c || 0,
    occupied: occupied?.c || 0,
    locked: locked?.c || 0,
    available: (total?.c || 0) - (occupied?.c || 0) - (locked?.c || 0),
  };
}

export function isSeatAvailable(seatId: string, flightId: string) {
  const seat: any = query.get(
    `SELECT * FROM seats WHERE id = ? AND flight_id = ?`,
    [seatId, flightId],
  );
  if (!seat) return false;
  if (seat.is_occupied) return false;
  const lock: any = query.get(
    `SELECT * FROM seat_locks WHERE seat_id = ? AND flight_id = ? AND expires_at > CURRENT_TIMESTAMP`,
    [seatId, flightId],
  );
  if (lock) return false;
  return true;
}

export function lockSeat({
  seatId,
  flightId,
  userId,
  bookingId,
  ttlSeconds = 300,
}: {
  seatId: string;
  flightId: string;
  userId?: string;
  bookingId?: string;
  ttlSeconds?: number;
}) {
  // check availability
  if (!isSeatAvailable(seatId, flightId)) {
    return { success: false, reason: "not_available" };
  }
  const id =
    (globalThis as any).crypto?.randomUUID?.() ||
    String(Date.now()) + Math.random().toString(36).slice(2);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  query.run(
    `INSERT INTO seat_locks (id, seat_id, flight_id, user_id, reserved_for_booking_id, expires_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, seatId, flightId, userId || null, bookingId || null, expiresAt],
  );
  try {
    realtime.emitSeatUpdate(flightId, { action: "lock", seatId, lockId: id });
  } catch (e) {}
  return { success: true, lockId: id, expiresAt };
}

export function unlockSeat(lockId: string) {
  const lock = query.get(`SELECT * FROM seat_locks WHERE id = ?`, [
    lockId,
  ]) as any;
  if (!lock) return { success: false, reason: "not_found" };
  query.run(`DELETE FROM seat_locks WHERE id = ?`, [lockId]);
  try {
    realtime.emitSeatUpdate(lock.flight_id, {
      action: "unlock",
      seatId: lock.seat_id,
      lockId,
    });
  } catch (e) {}
  return { success: true };
}

export function releaseExpiredLocks() {
  // Delete expired locks
  const res = query.run(
    `DELETE FROM seat_locks WHERE expires_at <= CURRENT_TIMESTAMP`,
  );
  return res.changes;
}

export function addToWaitlist({
  flightId,
  passengerProfileId,
  userId,
  requestedSeatClass,
}: {
  flightId: string;
  passengerProfileId?: string;
  userId?: string;
  requestedSeatClass?: string;
}) {
  const id =
    (globalThis as any).crypto?.randomUUID?.() ||
    String(Date.now()) + Math.random().toString(36).slice(2);
  query.run(
    `INSERT INTO flight_waitlist (id, flight_id, passenger_profile_id, user_id, requested_seat_class) VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      flightId,
      passengerProfileId || null,
      userId || null,
      requestedSeatClass || null,
    ],
  );
  return { id };
}

export function getWaitlistForFlight(flightId: string) {
  return query.all(
    `SELECT * FROM flight_waitlist WHERE flight_id = ? ORDER BY created_at`,
    [flightId],
  );
}
