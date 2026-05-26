import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { cacheGet, cacheSet, acquireLock, releaseLock, cacheDel } from "./cache";
import { getFlightById } from "./flights";
import type { Booking, Passenger } from "../types/booking";
import { prisma } from "./prisma";

const BOOKING_HOLD_KEY = (id: string) => `hold:${id}`;
const FLIGHT_HOLDS_KEY = (flightId: string) => `flight_holds:${flightId}`;
const FLIGHT_BOOKED_KEY = (flightId: string) => `flight_booked:${flightId}`;
const DEFAULT_HOLD_TTL = 900; // 15 mins

export type CreateHoldInput = {
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

export function calculateFare(basePrice: number, seats: number, promoCode?: string) {
  const baseFare = Math.round(basePrice * seats * 100) / 100;
  const taxes = Math.round(baseFare * 0.16 * 100) / 100;
  const fees = 10 * seats;
  let discount = 0;
  if (promoCode === "PROMO10") discount = Math.round(baseFare * 0.1 * 100) / 100;
  const total = Math.round((baseFare + taxes + fees - discount) * 100) / 100;
  return { baseFare, taxes, fees, discount, total };
}

export async function createHold(input: CreateHoldInput) {
  const holdId = uuidv4();
  const flight = getFlightById(input.flightId);
  if (!flight) throw new Error("Flight not found");

  const fare = calculateFare(flight.basePrice, input.seats, input.promoCode);
  const expiresAt = Date.now() + DEFAULT_HOLD_TTL * 1000;

  const hold = {
    id: holdId,
    flightId: input.flightId,
    seatClass: input.seatClass,
    seats: input.seats,
    passengers: input.passengers,
    fare,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    expiresAt,
  };

  await cacheSet(BOOKING_HOLD_KEY(holdId), hold, DEFAULT_HOLD_TTL);
  return { holdId, expiresAt, fare, hold };
}

export async function confirmBooking(holdId: string, paymentInfo?: any) {
  const hold = await cacheGet(BOOKING_HOLD_KEY(holdId));
  if (!hold) throw new Error("Hold not found or expired");

  const bookingId = uuidv4();
  const reference = crypto.randomBytes(4).toString("hex").toUpperCase();

  // Create booking using Prisma
  const booking = await prisma.booking.create({
    data: {
      id: bookingId,
      bookingReference: reference,
      flightId: hold.flightId,
      seatClass: hold.seatClass as any,
      totalAmount: hold.fare.total,
      contactEmail: hold.contactEmail,
      contactPhone: hold.contactPhone,
      status: "CONFIRMED",
      passengers: {
        create: hold.passengers.map((p: any) => ({
          firstName: p.firstName,
          lastName: p.lastName,
          passengerId: p.profileId || null,
        }))
      }
    },
    include: { passengers: true }
  });

  await cacheDel(BOOKING_HOLD_KEY(holdId));
  return { booking, receipt: { reference } };
}

export async function getBooking(id: string) {
  const b = await prisma.booking.findUnique({
    where: { id },
    include: { passengers: true }
  });
  if (!b) return null;
  
  // Format for UI
  return {
    id: b.id,
    reference: b.bookingReference,
    flightId: b.flightId,
    status: b.status,
    seatClass: b.seatClass,
    seats: b.passengers.length,
    fare: { total: b.totalAmount },
    passengers: b.passengers.map(p => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      profileId: p.passengerId
    })),
    createdAt: b.createdAt.getTime(),
  };
}

export async function previewCancellation(bookingId: string, passengerIds?: string[], forceRefund?: boolean) {
  const b = await getBooking(bookingId);
  if (!b) throw new Error("Booking not found");
  
  const refundAmount = b.fare.total; // Simplified refund logic
  return {
    bookingId,
    reference: b.reference,
    refundEligible: true,
    refundAmount,
  };
}

export async function cancelBooking(bookingId: string, input: any) {
  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" }
  });
  return await getBooking(bookingId);
}

export async function getBookingHistory(bookingId: string) { return []; }
export async function getBookingAudit(bookingId: string) { return []; }
export async function getCancellationReport() { return []; }
export async function undoCancellation(bookingId: string, actor: any) { return null; }
export async function modifyBooking(bookingId: string, changes: any, actor: any) { return null; }
