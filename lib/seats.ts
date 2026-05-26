import { prisma } from "./prisma";
import realtime from "./realtime";
import {
  REQUIRED_TRAVEL_CLASSES,
  normalizeTravelClass,
  travelClassFromSeatClass,
} from "./travel-classes";

const DEFAULT_CLASS_CAPACITY: Record<string, number> = {
  CLASS_A: 20,
  CLASS_B: 60,
  CLASS_C: 120,
};

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

export async function getClassCapacitySummary(flightId: string) {
  const rows = await Promise.all(
    REQUIRED_TRAVEL_CLASSES.map(async (travelClass) => {
      const seatClass = travelClass.seatClass as any;
      const physicalCapacity = await prisma.seat.count({
        where: { flightId, seatClass },
      });
      const occupiedSeats = await prisma.seat.count({
        where: { flightId, seatClass, isOccupied: true },
      });
      const bookedPassengers = await prisma.bookingPassenger.count({
        where: {
          booking: {
            flightId,
            seatClass,
            status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
          },
        },
      });
      const classSeats = await prisma.seat.findMany({
        where: { flightId, seatClass },
        select: { id: true },
      });
      const locked = classSeats.length
        ? await prisma.seatLock.count({
            where: {
              flightId,
              expiresAt: { gt: new Date() },
              seatId: { in: classSeats.map((seat) => seat.id) },
            },
          })
        : 0;
      const capacity = physicalCapacity || DEFAULT_CLASS_CAPACITY[travelClass.code];
      const used = Math.max(occupiedSeats, bookedPassengers);
      const available = Math.max(0, capacity - used - locked);
      return {
        code: travelClass.code,
        shortCode: travelClass.shortCode,
        label: travelClass.label,
        description: travelClass.description,
        seatClass: travelClass.seatClass,
        capacity,
        occupied: used,
        locked,
        available,
        isFull: available <= 0,
      };
    }),
  );

  return rows;
}

export async function getClassAvailability(
  flightId: string,
  requestedClass?: string | null,
) {
  const travelClass = normalizeTravelClass(requestedClass);
  const classes = await getClassCapacitySummary(flightId);
  const selected = classes.find((entry) => entry.code === travelClass.code) || classes[2];
  const nextAvailable = selected.available > 0
    ? null
    : await findNextAvailableFlightForClass(flightId, travelClass.code);

  return { selected, classes, nextAvailable };
}

export async function findNextAvailableFlightForClass(
  flightId: string,
  requestedClass?: string | null,
) {
  const travelClass = normalizeTravelClass(requestedClass);
  const current = await prisma.flight.findUnique({ where: { id: flightId } });
  if (!current) return null;

  const candidates = await prisma.flight.findMany({
    where: {
      id: { not: flightId },
      origin: current.origin,
      destination: current.destination,
      status: { not: "CANCELLED" },
      departureTime: current.departureTime
        ? { gt: current.departureTime }
        : { gt: new Date() },
    },
    orderBy: { departureTime: "asc" },
    take: 20,
  });

  for (const candidate of candidates) {
    const capacity = await getClassCapacitySummary(candidate.id);
    const selected = capacity.find((entry) => entry.code === travelClass.code);
    if (selected && selected.available > 0) {
      return {
        flightId: candidate.id,
        flightNumber: candidate.flightNumber,
        origin: candidate.origin,
        destination: candidate.destination,
        departureTime: candidate.departureTime?.toISOString() || null,
        arrivalTime: candidate.arrivalTime?.toISOString() || null,
        class: selected,
      };
    }
  }

  return null;
}

export function summarizeRequiredClassFromSeatClass(seatClass?: string | null) {
  const travelClass = travelClassFromSeatClass(seatClass);
  return {
    code: travelClass.code,
    shortCode: travelClass.shortCode,
    label: travelClass.label,
    description: travelClass.description,
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
