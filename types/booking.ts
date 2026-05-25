import type { SeatClass } from "./flight";
import type { AccessibilityNeeds } from "../lib/accessibility";

export type PassengerType = "ADULT" | "CHILD" | "INFANT" | "SENIOR";

export interface Passenger {
  id: string;
  profileId?: string | null;
  firstName: string;
  lastName: string;
  type: PassengerType;
  dob?: string;
  passportNo?: string | null;
  nationality?: string | null;
  phone?: string | null;
  specialAssistance?: string | null;
  seatAssignment?: string | null;
  mealPreference?: string | null;
  frequentFlyerNumber?: string | null;
  travelPreferences?: Record<string, any>;
  notes?: string | null;
  tags?: string[];
  vipLabel?: string | null;
  accessibilityNeeds?: AccessibilityNeeds | null;
}

export interface FareBreakdown {
  baseFare: number;
  taxes: number;
  fees: number;
  discount: number;
  total: number;
}

export interface Booking {
  id: string;
  reference: string;
  flightId: string;
  passengers: Passenger[];
  seatClass: SeatClass;
  seats: number;
  fare: FareBreakdown;
  promoCode?: string | null;
  status: "HOLD" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
  expiresAt?: number | null;
  createdAt: number;
  contactEmail?: string | null;
  contactPhone?: string | null;
  version?: number;
  // timeline of status changes and key events
  statusTimeline?: { status: string; at: number; note?: string }[];
  cancellation?: BookingCancellation | null;
}

export interface BookingHistoryEntry {
  version: number;
  snapshot: Booking;
  reason?: string;
  actor?: string;
  at: number;
}

export interface BookingAuditEntry {
  action: string;
  details?: any;
  actor?: string;
  at: number;
}

export interface BookingCancellation {
  id: string;
  bookingId: string;
  reason: string;
  requestedByRole?: "PASSENGER" | "STAFF" | "ADMIN";
  cancelledPassengerIds: string[];
  cancelledSeats: number;
  partial: boolean;
  refundEligible: boolean;
  refundAmount: number;
  refundPolicy: string;
  cancelledAt: number;
  undoUntil?: number | null;
  undoneAt?: number | null;
  actor?: string | null;
  notes?: string | null;
}

export interface CancellationReportEntry {
  bookingId: string;
  reference: string;
  reason: string;
  cancelledSeats: number;
  refundEligible: boolean;
  refundAmount: number;
  partial: boolean;
  role?: "PASSENGER" | "STAFF" | "ADMIN";
  at: number;
}
