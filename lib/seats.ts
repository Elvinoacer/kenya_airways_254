import { prisma } from "./prisma";
import realtime from "./realtime";

export async function getSeatsForFlight(flightId: string) {
  const seats = await prisma.seat.findMany({
    where: { flightId },
    include: { meta: true },
    orderBy: [{ seatClass: "asc" }, { seatNumber: "asc" }],
  });
  return seats.map((s) => ({
    id: s.id,
    flight_id: s.flightId,
    seat_number: s.seatNumber,
    seat_class: s.seatClass,
    is_occupied: s.isOccupied,
    is_emergency_exit: s.meta?.isEmergencyExit || false,
    is_accessible: s.meta?.isAccessible || false,
    price_modifier: s.meta?.priceModifier || null,
    preference_tags: s.meta?.preferenceTags || null,
  }));
}

export async function getSeatOccupancySummary(flightId: string) {
  const total = await prisma.seat.count({ where: { flightId } });
  const occupied = await prisma.seat.count({ where: { flightId, isOccupied: true } });
  const locked = await prisma.seatLock.count({
    where: { flightId, expiresAt: { gt: new Date() } },
  });
  return {
    total,
    occupied,
    locked,
    available: total - occupied - locked,
  };
}

export async function isSeatAvailable(seatId: string, flightId: string) {
  const seat = await prisma.seat.findFirst({
    where: { id: seatId, flightId },
  });
  if (!seat) return false;
  if (seat.isOccupied) return false;
  const lock = await prisma.seatLock.findFirst({
    where: { seatId, flightId, expiresAt: { gt: new Date() } },
  });
  if (lock) return false;
  return true;
}

export async function lockSeat({
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
  if (!(await isSeatAvailable(seatId, flightId))) {
    return { success: false, reason: "not_available" };
  }
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const lock = await prisma.seatLock.create({
    data: {
      seatId,
      flightId,
      userId: userId || null,
      reservedForBookingId: bookingId || null,
      expiresAt,
    },
  });
  try {
    realtime.emitSeatUpdate(flightId, { action: "lock", seatId, lockId: lock.id });
  } catch (e) {}
  return { success: true, lockId: lock.id, expiresAt: expiresAt.toISOString() };
}

export async function unlockSeat(lockId: string) {
  const lock = await prisma.seatLock.findUnique({ where: { id: lockId } });
  if (!lock) return { success: false, reason: "not_found" };
  await prisma.seatLock.delete({ where: { id: lockId } });
  try {
    realtime.emitSeatUpdate(lock.flightId, {
      action: "unlock",
      seatId: lock.seatId,
      lockId,
    });
  } catch (e) {}
  return { success: true };
}

export async function releaseExpiredLocks() {
  const result = await prisma.seatLock.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
  return result.count;
}

export async function addToWaitlist({
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
  const entry = await prisma.flightWaitlist.create({
    data: {
      flightId,
      passengerProfileId: passengerProfileId || null,
      userId: userId || null,
      requestedSeatClass: requestedSeatClass || null,
    },
  });
  return { id: entry.id };
}

export async function getWaitlistForFlight(flightId: string) {
  return prisma.flightWaitlist.findMany({
    where: { flightId },
    orderBy: { createdAt: "asc" },
  });
}
