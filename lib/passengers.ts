import crypto from "node:crypto";
import { prisma } from "./prisma";

export interface PassengerProfile {
  id: string;
  ownerUserId: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth?: string | null;
  passportNo?: string | null;
  nationality?: string | null;
  frequentFlyerNumber?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // Mock missing complex fields for UI compatibility
  phone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  travelPreferences: Record<string, any>;
  accessibilityNeeds?: any | null;
  notes?: string | null;
  vipLabel?: string | null;
  tags: string[];
  isBlacklisted: boolean;
  blacklistReason?: string | null;
  mergedIntoId?: string | null;
  deletedAt?: string | null;
}

function mapToProfile(dbPassenger: any): PassengerProfile {
  return {
    id: dbPassenger.id,
    ownerUserId: dbPassenger.userId,
    firstName: dbPassenger.firstName,
    lastName: dbPassenger.lastName,
    dateOfBirth: dbPassenger.dateOfBirth ? dbPassenger.dateOfBirth.toISOString() : null,
    passportNo: dbPassenger.passportNumber,
    nationality: dbPassenger.nationality,
    frequentFlyerNumber: dbPassenger.frequentFlyerNo,
    createdAt: dbPassenger.createdAt.toISOString(),
    updatedAt: dbPassenger.updatedAt.toISOString(),
    // Fallbacks
    travelPreferences: {},
    tags: [],
    isBlacklisted: false,
  };
}

export async function listPassengerProfiles(filters: { ownerUserId?: string } = {}): Promise<PassengerProfile[]> {
  const passengers = await prisma.passenger.findMany({
    where: filters.ownerUserId ? { userId: filters.ownerUserId } : {},
    orderBy: { updatedAt: 'desc' }
  });
  return passengers.map(mapToProfile);
}

export async function getPassengerProfile(passengerId: string): Promise<PassengerProfile | null> {
  const passenger = await prisma.passenger.findUnique({ where: { id: passengerId } });
  if (!passenger) return null;
  return mapToProfile(passenger);
}

export async function getPassengerProfilesByIds(passengerIds: string[]): Promise<PassengerProfile[]> {
  const passengers = await prisma.passenger.findMany({
    where: { id: { in: passengerIds } }
  });
  return passengers.map(mapToProfile);
}

export async function createPassengerProfile(input: any, actor?: string): Promise<{ profile?: PassengerProfile | null, duplicate?: boolean, duplicates?: any[] }> {
  const passenger = await prisma.passenger.create({
    data: {
      userId: input.ownerUserId || null,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      passportNumber: input.passportNo,
      nationality: input.nationality,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      frequentFlyerNo: input.frequentFlyerNumber
    }
  });
  return { profile: mapToProfile(passenger), duplicate: false };
}

export async function updatePassengerProfile(passengerId: string, input: any, actor?: string) {
  const passenger = await prisma.passenger.update({
    where: { id: passengerId },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      passportNumber: input.passportNo,
      nationality: input.nationality,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
      frequentFlyerNo: input.frequentFlyerNumber
    }
  });
  return { profile: mapToProfile(passenger) };
}

export async function deletePassengerProfile(passengerId: string, actor?: string) {
  await prisma.passenger.delete({ where: { id: passengerId } });
  return { ok: true };
}

// Dummy functions for complex legacy features
export async function detectDuplicatePassengers(input: any) { return []; }
export async function findPassengerDuplicates(input: any) { return []; }
export async function blacklistPassengerProfile(id: string, reason: string) { return null; }
export async function unblacklistPassengerProfile(id: string) { return null; }
export async function setPassengerTags(id: string, tags: string[], vipLabel?: string) { return null; }
export async function getPassengerTravelHistory(id: string) { return []; }
export async function recordPassengerTravel(input: any) {}
export async function recordPassengerTravelForBooking(booking: any, eventType: string, actor?: string) {}
export async function mergePassengerProfiles(input: any) { throw new Error("Not implemented in clean schema"); }
