import crypto from "crypto";
import { cacheDel, cacheGet, cacheSet } from "./cache";
import { getFlightById } from "./flights";
import { prisma } from "./prisma";
import realtime from "./realtime";
import { getClassAvailability, summarizeRequiredClassFromSeatClass } from "./seats";
import { hasRequiredPassportDetails } from "./passport";
import { normalizeTravelClass } from "./travel-classes";
import type { Passenger } from "../types/booking";

type PassengerProfileRow = Awaited<ReturnType<typeof prisma.passenger.findMany>>[number];
type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const BOOKING_HOLD_KEY = (id: string) => `hold:${id}`;
const DEFAULT_HOLD_TTL = 900;

export type CreateHoldInput = {
  flightId: string;
  seatClass?: string;
  travelClass?: string;
  seats: number;
  passengers?: Passenger[];
  passengerProfileIds?: string[];
  contactEmail?: string;
  contactPhone?: string;
  promoCode?: string;
  userId?: string;
};

async function audit(action: string, targetId: string, details?: any, actor?: string) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        targetType: "Booking",
        targetId,
        actorId: actor || null,
        detailsJson: JSON.stringify(details || {}),
      },
    });
  } catch {
    // Auditing should never block the booking flow.
  }
}

async function getFlightForBooking(flightId: string) {
  const dbFlight = await prisma.flight.findUnique({
    where: { id: flightId },
    include: { route: true },
  });
  if (dbFlight) {
    return {
      id: dbFlight.id,
      flightNumber: dbFlight.flightNumber,
      origin: dbFlight.origin || dbFlight.route?.origin || "",
      destination: dbFlight.destination || dbFlight.route?.destination || "",
      departAt: dbFlight.departureTime?.toISOString() || null,
      arriveAt: dbFlight.arrivalTime?.toISOString() || null,
      basePrice: dbFlight.route?.basePrice || 22000,
      isDatabaseFlight: true,
    };
  }

  const mockFlight = getFlightById(flightId);
  if (!mockFlight) return null;
  return {
    id: mockFlight.id,
    flightNumber: mockFlight.flightNumber,
    origin: mockFlight.origin,
    destination: mockFlight.destination,
    departAt: mockFlight.departAt,
    arriveAt: mockFlight.arriveAt,
    basePrice: mockFlight.basePrice,
    isDatabaseFlight: false,
  };
}

async function resolvePassengers(input: CreateHoldInput) {
  const draftPassengers = input.passengers || [];
  const profiles = input.passengerProfileIds?.length
    ? await prisma.passenger.findMany({
        where: { id: { in: input.passengerProfileIds } },
      })
    : [];

  const profilePassengers = profiles.map((profile: PassengerProfileRow) => ({
    id: profile.id,
    profileId: profile.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    type: "ADULT" as const,
    passportNo: profile.passportNumber,
    nationality: profile.nationality,
    phone: profile.phone,
  }));

  return [...profilePassengers, ...draftPassengers];
}

function classAdjustedPrice(basePrice: number, requestedClass?: string | null) {
  const travelClass = normalizeTravelClass(requestedClass);
  return Math.round(basePrice * travelClass.fareMultiplier * 100) / 100;
}

export function calculateFare(basePrice: number, seats: number, promoCode?: string, requestedClass?: string | null) {
  const classPrice = classAdjustedPrice(basePrice, requestedClass);
  const baseFare = Math.round(classPrice * seats * 100) / 100;
  const taxes = Math.round(baseFare * 0.16 * 100) / 100;
  const fees = 10 * seats;
  const discount = promoCode === "PROMO10" ? Math.round(baseFare * 0.1 * 100) / 100 : 0;
  const total = Math.round((baseFare + taxes + fees - discount) * 100) / 100;
  return { baseFare, taxes, fees, discount, total };
}

function bookingReference() {
  return `KQ${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function createHold(input: CreateHoldInput) {
  const flight = await getFlightForBooking(input.flightId);
  if (!flight) throw new Error("Flight not found");

  const travelClass = normalizeTravelClass(input.travelClass || input.seatClass);
  const passengers = await resolvePassengers(input);
  const seats = Math.max(1, passengers.length || Number(input.seats || 1));
  if (!passengers.length) {
    throw new Error("At least one passenger is required before booking.");
  }
  const missingPassportPassenger = passengers.find(
    (passenger: any) =>
      !hasRequiredPassportDetails({
        passportNo: passenger.passportNo,
        nationality: passenger.nationality,
      }),
  );
  if (missingPassportPassenger) {
    throw new Error(
      `Passport details are required for ${missingPassportPassenger.firstName || "each"} ${missingPassportPassenger.lastName || "passenger"}.`,
    );
  }
  const availability = await getClassAvailability(input.flightId, travelClass.code);

  if (availability.selected.available < seats) {
    return {
      ok: false,
      error: "class_full",
      message: `${travelClass.label} is full or does not have ${seats} seat(s) available.`,
      availability,
    };
  }

  const fare = calculateFare(flight.basePrice, seats, input.promoCode, travelClass.code);
  const holdId = crypto.randomUUID();
  const expiresAt = Date.now() + DEFAULT_HOLD_TTL * 1000;
  const hold = {
    id: holdId,
    flightId: input.flightId,
    flight,
    travelClass: travelClass.code,
    travelClassLabel: travelClass.label,
    seatClass: travelClass.seatClass,
    seats,
    passengers,
    passengerProfileIds: input.passengerProfileIds || [],
    fare,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    promoCode: input.promoCode,
    userId: input.userId,
    expiresAt,
  };

  await cacheSet(BOOKING_HOLD_KEY(holdId), hold, DEFAULT_HOLD_TTL);
  await realtime.emitBookingChange(holdId, {
    action: "hold_created",
    flightId: input.flightId,
    travelClass: travelClass.code,
  });
  return { ok: true, holdId, expiresAt, fare, hold, availability };
}

export async function confirmBooking(holdId: string, paymentInfo?: any) {
  const hold = await cacheGet<any>(BOOKING_HOLD_KEY(holdId));
  if (!hold) throw new Error("Hold not found or expired");

  const availability = await getClassAvailability(hold.flightId, hold.travelClass);
  if (availability.selected.available < hold.seats) {
    throw new Error("Selected class is now full. Please choose the next available flight.");
  }

  const reference = bookingReference();
  const booking = await prisma.$transaction(async (tx: PrismaTx) => {
    const bookingPassengers = [];
    for (const passenger of hold.passengers) {
      let passengerId = passenger.profileId || null;
      if (!passengerId && passenger.passportNo) {
        const existingPassenger = await tx.passenger.findUnique({
          where: { passportNumber: passenger.passportNo },
        });
        if (existingPassenger) {
          passengerId = existingPassenger.id;
        } else {
          const createdPassenger = await tx.passenger.create({
            data: {
              firstName: passenger.firstName,
              lastName: passenger.lastName,
              passportNumber: passenger.passportNo,
              nationality: passenger.nationality || null,
              dateOfBirth: passenger.dob ? new Date(passenger.dob) : null,
              phone: passenger.phone || null,
            },
          });
          passengerId = createdPassenger.id;
        }
      }
      bookingPassengers.push({
        firstName: passenger.firstName,
        lastName: passenger.lastName,
        passengerId,
      });
    }

    const created = await tx.booking.create({
      data: {
        bookingReference: reference,
        flightId: hold.flightId,
        userId: hold.userId || null,
        seatClass: hold.seatClass as any,
        totalAmount: hold.fare.total,
        contactEmail: hold.contactEmail || null,
        contactPhone: hold.contactPhone || null,
        status: "CONFIRMED",
        passengers: {
          create: bookingPassengers,
        },
        payments: {
          create: {
            amount: hold.fare.total,
            currency: "KES",
            provider: paymentInfo?.provider || "COUNTER_OR_ONLINE",
            status: "SUCCESS",
            transactionId: paymentInfo?.transactionId || reference,
            metadataJson: JSON.stringify(paymentInfo || {}),
          },
        },
      },
      include: { passengers: true, payments: true, flight: true },
    });

    const freeSeats = await tx.seat.findMany({
      where: {
        flightId: hold.flightId,
        seatClass: hold.seatClass as any,
        isOccupied: false,
      },
      orderBy: { seatNumber: "asc" },
      take: hold.seats,
    });

    for (let i = 0; i < Math.min(freeSeats.length, created.passengers.length); i++) {
      await tx.seat.update({
        where: { id: freeSeats[i].id },
        data: { isOccupied: true },
      });
      await tx.bookingPassenger.update({
        where: { id: created.passengers[i].id },
        data: { seatAssignment: freeSeats[i].seatNumber },
      });
    }

    return created;
  });

  await cacheDel(BOOKING_HOLD_KEY(holdId));
  await audit("booking.confirm", booking.id, { reference, holdId }, hold.userId);
  await realtime.emitBookingChange(booking.id, {
    action: "confirmed",
    reference,
    flightId: hold.flightId,
  });
  return { booking: await getBooking(booking.id), receipt: { reference } };
}

export async function getBooking(idOrReference: string) {
  const b = await prisma.booking.findFirst({
    where: {
      OR: [{ id: idOrReference }, { bookingReference: idOrReference }],
    },
    include: { passengers: true, flight: true, payments: true, cancellation: true },
  });
  if (!b) return null;

  return {
    id: b.id,
    reference: b.bookingReference,
    flightId: b.flightId,
    flightNumber: b.flight?.flightNumber || null,
    route: b.flight?.origin && b.flight?.destination ? `${b.flight.origin} to ${b.flight.destination}` : null,
    departureTime: b.flight?.departureTime?.toISOString() || null,
    status: b.status,
    seatClass: b.seatClass,
    travelClass: summarizeRequiredClassFromSeatClass(b.seatClass),
    seats: b.passengers.length,
    fare: { total: b.totalAmount },
    paymentStatus: b.payments[0]?.status || null,
    passengers: b.passengers.map((p: any) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      profileId: p.passengerId,
      seatAssignment: p.seatAssignment,
    })),
    cancellation: b.cancellation,
    contactEmail: b.contactEmail,
    contactPhone: b.contactPhone,
    createdAt: b.createdAt.getTime(),
    updatedAt: b.updatedAt.getTime(),
  };
}

export async function previewCancellation(bookingId: string, passengerIds?: string[], forceRefund?: boolean) {
  const b = await getBooking(bookingId);
  if (!b) throw new Error("Booking not found");
  const selectedCount = passengerIds?.length || b.passengers.length;
  const refundAmount =
    forceRefund || b.status === "CONFIRMED"
      ? Math.round((b.fare.total / Math.max(1, b.passengers.length)) * selectedCount * 0.8)
      : 0;
  return {
    bookingId: b.id,
    reference: b.reference,
    refundEligible: refundAmount > 0,
    refundAmount,
    cancelledSeats: selectedCount,
    partial: selectedCount < b.passengers.length,
  };
}

export async function cancelBooking(bookingId: string, input: any = {}) {
  const current = await prisma.booking.findFirst({
    where: { OR: [{ id: bookingId }, { bookingReference: bookingId }] },
    include: { passengers: true },
  });
  if (!current) throw new Error("Booking not found");
  const preview = await previewCancellation(current.id, input.passengerIds, input.forceRefund);
  const booking = await prisma.booking.update({
    where: { id: preview.bookingId },
    data: {
      status: "CANCELLED",
      cancellation: {
        upsert: {
          create: {
            reason: input.reason || "Cancelled by user",
            cancelledSeats: preview.cancelledSeats,
            refundAmount: preview.refundAmount,
            actor: input.actor || input.requestedByRole || null,
          },
          update: {
            reason: input.reason || "Cancelled by user",
            cancelledSeats: preview.cancelledSeats,
            refundAmount: preview.refundAmount,
            actor: input.actor || input.requestedByRole || null,
          },
        },
      },
    },
  });

  await prisma.seat.updateMany({
    where: {
      flightId: booking.flightId,
      seatClass: booking.seatClass,
      seatNumber: {
        in: current.passengers.map((passenger: any) => passenger.seatAssignment).filter(Boolean) as string[],
      },
    },
    data: { isOccupied: false },
  });
  await audit("booking.delete", booking.id, input, input.actor);
  await realtime.emitBookingChange(booking.id, {
    action: "cancelled",
    reason: input.reason || "Cancelled by user",
  });
  return await getBooking(booking.id);
}

export async function modifyBooking(bookingId: string, changes: any = {}, actor?: any) {
  const current = await prisma.booking.findFirst({
    where: { OR: [{ id: bookingId }, { bookingReference: bookingId }] },
    include: { passengers: true },
  });
  if (!current) throw new Error("Booking not found");
  if (current.status === "CANCELLED") throw new Error("Cancelled bookings cannot be changed");

  const travelClass =
    changes.travelClass || changes.seatClass ? normalizeTravelClass(changes.travelClass || changes.seatClass) : null;
  const nextSeatClass = travelClass?.seatClass || current.seatClass;
  const nextPassengerCount =
    Array.isArray(changes.passengers) && changes.passengers.length
      ? changes.passengers.length
      : current.passengers.length;

  if (travelClass) {
    const availability = await getClassAvailability(current.flightId, travelClass.code);
    if (availability.selected.available + current.passengers.length < nextPassengerCount) {
      return {
        ok: false,
        error: "class_full",
        message: `${travelClass.label} is full for the requested change.`,
        availability,
      };
    }
  }

  const flight = await getFlightForBooking(current.flightId);
  const fare = calculateFare(
    flight?.basePrice || current.totalAmount,
    nextPassengerCount,
    changes.promoCode,
    travelClass?.code || current.seatClass,
  );

  const updated = await prisma.$transaction(async (tx: PrismaTx) => {
    if (Array.isArray(changes.passengers)) {
      await tx.bookingPassenger.deleteMany({ where: { bookingId: current.id } });
    }

    return tx.booking.update({
      where: { id: current.id },
      data: {
        seatClass: nextSeatClass as any,
        totalAmount: fare.total,
        contactEmail: changes.contactEmail === undefined ? current.contactEmail : changes.contactEmail || null,
        contactPhone: changes.contactPhone === undefined ? current.contactPhone : changes.contactPhone || null,
        passengers: Array.isArray(changes.passengers)
          ? {
              create: changes.passengers.map((p: any) => ({
                firstName: p.firstName,
                lastName: p.lastName,
                passengerId: p.profileId || null,
              })),
            }
          : undefined,
      },
      include: { passengers: true },
    });
  });

  await audit("booking.change", updated.id, { changes, fare }, actor?.userId || actor);
  await realtime.emitBookingChange(updated.id, { action: "changed", changes });
  return { ok: true, booking: await getBooking(updated.id) };
}

export async function getBookingHistory(bookingId: string) {
  return getBookingAudit(bookingId);
}

export async function getBookingAudit(bookingId: string) {
  const booking = await prisma.booking.findFirst({
    where: { OR: [{ id: bookingId }, { bookingReference: bookingId }] },
  });
  if (!booking) return [];
  return prisma.auditLog.findMany({
    where: { targetType: "Booking", targetId: booking.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCancellationReport() {
  return prisma.bookingCancellation.findMany({
    include: { booking: { include: { flight: true } } },
    orderBy: { cancelledAt: "desc" },
  });
}

export async function undoCancellation(bookingId: string, actor: any) {
  const booking = await prisma.booking.findFirst({
    where: { OR: [{ id: bookingId }, { bookingReference: bookingId }] },
  });
  if (!booking) throw new Error("Booking not found");
  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "CONFIRMED", cancellation: { delete: true } },
  });
  await audit("booking.undo_delete", booking.id, {}, actor?.userId || actor);
  return getBooking(booking.id);
}
