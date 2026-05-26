"use client";

import React, { useEffect, useMemo, useState } from "react";
import PassportRequirementPanel from "../components/passport/PassportRequirementPanel";
import WorkflowShell from "../components/WorkflowShell";
import {
  accessibilityNeedsSummary,
  type AccessibilityNeeds,
} from "../../lib/accessibility";
import {
  createKenyanPassportDetails,
  hasRequiredPassportDetails,
  type PassportDetails,
} from "../../lib/passport";

type PassengerProfile = {
  id: string;
  firstName: string;
  lastName: string;
  passportNo?: string | null;
  nationality?: string | null;
  dateOfBirth?: string | null;
  vipLabel?: string | null;
  tags?: string[];
  travelPreferences?: Record<string, any>;
  accessibilityNeeds?: AccessibilityNeeds | null;
};

type DraftPassenger = {
  firstName: string;
  lastName: string;
  passportNo: string;
  nationality: string;
  dateOfBirth: string;
  passportDetails?: PassportDetails;
  travelPreferences: Record<string, any>;
  accessibilityNeeds: AccessibilityNeeds;
};

type Flight = {
  id: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departAt: string;
  basePrice: number;
  classCapacity?: any[];
};

const TRAVEL_CLASSES = [
  { code: "CLASS_A", shortCode: "A", label: "Class A: Executive" },
  { code: "CLASS_B", shortCode: "B", label: "Class B: Middle class" },
  { code: "CLASS_C", shortCode: "C", label: "Class C: Low class" },
];

export default function BookingPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [profiles, setProfiles] = useState<PassengerProfile[]>([]);
  const [selectedFlightId, setSelectedFlightId] = useState("");
  const [seatClass, setSeatClass] = useState<"CLASS_A" | "CLASS_B" | "CLASS_C">("CLASS_C");
  const [seatCount, setSeatCount] = useState(1);
  const [availability, setAvailability] = useState<any>(null);
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [draftPassengers, setDraftPassengers] = useState<DraftPassenger[]>([]);
  const [draftPassenger, setDraftPassenger] = useState<DraftPassenger>({
    firstName: "",
    lastName: "",
    passportNo: "",
    nationality: "Kenyan",
    dateOfBirth: "",
    travelPreferences: {},
    accessibilityNeeds: {
      wheelchairAssistance: false,
      visualImpairmentAssistance: false,
      hearingImpairmentAssistance: false,
      medicalAssistance: "",
      specialMealRequest: "",
      companionSupport: {
        required: false,
        companionCount: 0,
        notes: "",
      },
      accessibleSeating: false,
      notes: "",
    },
  });
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [hold, setHold] = useState<any>(null);
  const [confirmed, setConfirmed] = useState<any>(null);
  const [inquiryRef, setInquiryRef] = useState("");
  const [inquiryBooking, setInquiryBooking] = useState<any>(null);
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const [flightRes, passengerRes] = await Promise.all([
        fetch("/api/flights"),
        fetch("/api/passengers"),
      ]);
      const flightsData = await flightRes.json();
      const passengerData = await passengerRes.json();
      setFlights(flightsData.results || []);
      setProfiles(passengerData.passengers || []);
      const requestedFlightId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("flightId")
          : null;
      if (!selectedFlightId && requestedFlightId) {
        setSelectedFlightId(requestedFlightId);
      } else if (!selectedFlightId && flightsData.results?.[0]?.id) {
        setSelectedFlightId(flightsData.results[0].id);
      }
    }
    load().catch((err) =>
      setError(err.message || "Failed to load booking data"),
    );
  }, []);

  useEffect(() => {
    async function loadAvailability() {
      if (!selectedFlightId) return;
      const res = await fetch(
        `/api/seats/availability?flightId=${encodeURIComponent(selectedFlightId)}&class=${encodeURIComponent(seatClass)}`,
      );
      const data = await res.json();
      setAvailability(data.classAvailability || null);
    }
    loadAvailability().catch(() => setAvailability(null));
  }, [selectedFlightId, seatClass, hold, confirmed]);

  const selectedProfiles = useMemo(
    () => profiles.filter((profile) => selectedProfileIds.includes(profile.id)),
    [profiles, selectedProfileIds],
  );

  const selectedProfilesMissingPassports = useMemo(
    () =>
      selectedProfiles.filter(
        (profile) =>
          !hasRequiredPassportDetails({
            passportNo: profile.passportNo,
            nationality: profile.nationality,
          }),
      ),
    [selectedProfiles],
  );

  const draftPassengersMissingPassports = useMemo(
    () =>
      draftPassengers.filter(
        (passenger) =>
          !hasRequiredPassportDetails({
            passportNo: passenger.passportNo,
            nationality: passenger.nationality,
          }),
      ),
    [draftPassengers],
  );

  const passportRequirementSatisfied =
    selectedProfilesMissingPassports.length === 0 &&
    draftPassengersMissingPassports.length === 0 &&
    selectedProfiles.length + draftPassengers.length > 0;

  function toggleProfile(profileId: string) {
    setSelectedProfileIds((current) =>
      current.includes(profileId)
        ? current.filter((id) => id !== profileId)
        : [...current, profileId],
    );
  }

  function updateDraftAccessibility(
    patch: Partial<AccessibilityNeeds> & {
      companionSupport?: Partial<
        NonNullable<AccessibilityNeeds["companionSupport"]>
      >;
    },
  ) {
    setDraftPassenger((current) => ({
      ...current,
      accessibilityNeeds: {
        ...current.accessibilityNeeds,
        ...patch,
        companionSupport: {
          ...current.accessibilityNeeds.companionSupport,
          ...patch.companionSupport,
        },
      },
    }));
  }

  function addDraftPassenger() {
    if (!draftPassenger.firstName || !draftPassenger.lastName) return;
    if (
      !hasRequiredPassportDetails({
        passportNo: draftPassenger.passportNo,
        nationality: draftPassenger.nationality,
      })
    ) {
      setError("Add passport details before adding this passenger.");
      return;
    }
    setError("");
    setDraftPassengers((current) => [
      ...current,
      {
        ...draftPassenger,
        travelPreferences: {
          ...draftPassenger.travelPreferences,
          accessibilityNeeds: draftPassenger.accessibilityNeeds,
        },
      },
    ]);
    setDraftPassenger({
      firstName: "",
      lastName: "",
      passportNo: "",
      nationality: "Kenyan",
      dateOfBirth: "",
      travelPreferences: {},
      accessibilityNeeds: {
        wheelchairAssistance: false,
        visualImpairmentAssistance: false,
        hearingImpairmentAssistance: false,
        medicalAssistance: "",
        specialMealRequest: "",
        companionSupport: {
          required: false,
          companionCount: 0,
          notes: "",
        },
        accessibleSeating: false,
        notes: "",
      },
    });
  }

  async function generatePassportForProfile(profile: PassengerProfile) {
    setError("");
    const details = createKenyanPassportDetails({
      nationality: profile.nationality || "Kenyan",
    });
    const res = await fetch(`/api/passengers/${profile.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: (profile as any).phone || undefined,
        passportNo: details.passportNo,
        nationality: details.nationality,
        dateOfBirth: profile.dateOfBirth || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not update passenger passport details.");
      return;
    }
    setProfiles((current) =>
      current.map((item) =>
        item.id === profile.id
          ? {
              ...item,
              passportNo: data.profile?.passportNo || details.passportNo,
              nationality: data.profile?.nationality || details.nationality,
              dateOfBirth: data.profile?.dateOfBirth || item.dateOfBirth,
            }
          : item,
      ),
    );
  }

  async function createHold() {
    setLoading(true);
    setError("");
    setHold(null);
    try {
      const passengerCount = selectedProfileIds.length + draftPassengers.length;
      if (passengerCount === 0) {
        throw new Error("Add or select at least one passenger before creating a booking hold.");
      }
      if (!passportRequirementSatisfied) {
        throw new Error("Every passenger needs passport details before booking.");
      }
      const payload = {
        flightId: selectedFlightId,
        travelClass: seatClass,
        seats: passengerCount > 0 ? passengerCount : seatCount,
        passengerProfileIds: selectedProfileIds,
        passengers: draftPassengers.map((passenger, index) => ({
          id: `draft-${index}-${Date.now()}`,
          firstName: passenger.firstName,
          lastName: passenger.lastName,
          passportNo: passenger.passportNo,
          nationality: passenger.nationality,
          dob: passenger.dateOfBirth || undefined,
          type: "ADULT",
          travelPreferences: passenger.travelPreferences,
          accessibilityNeeds: passenger.accessibilityNeeds,
          mealPreference:
            passenger.accessibilityNeeds.specialMealRequest || null,
          specialAssistance:
            accessibilityNeedsSummary(passenger.accessibilityNeeds) || null,
        })),
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        promoCode: promoCode || undefined,
      };
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to create booking hold");
      if (data.ok === false) {
        setAvailability(data.availability || null);
        throw new Error(data.message || "Selected class is full.");
      }
      setHold(data);
    } catch (err: any) {
      setError(err.message || "Failed to create booking hold");
    } finally {
      setLoading(false);
    }
  }

  async function confirmHold() {
    if (!hold?.holdId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/bookings/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdId: hold.holdId,
          payment: { provider: "ONLINE", transactionId: `PAY-${Date.now()}` },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm booking");
      setConfirmed(data);
      setHold(null);
    } catch (err: any) {
      setError(err.message || "Failed to confirm booking");
    } finally {
      setLoading(false);
    }
  }

  async function lookupBooking() {
    if (!inquiryRef.trim()) return;
    setInquiryMessage("");
    const res = await fetch(`/api/bookings/${encodeURIComponent(inquiryRef.trim())}`);
    const data = await res.json();
    if (!res.ok) {
      setInquiryBooking(null);
      setInquiryMessage(data.error || "Booking not found");
      return;
    }
    setInquiryBooking(data.booking);
  }

  async function changeInquiryBooking(nextClass: string) {
    if (!inquiryBooking?.id) return;
    const res = await fetch("/api/bookings/modify", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: inquiryBooking.id,
        changes: { travelClass: nextClass },
        actor: "passenger",
      }),
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) {
      setInquiryMessage(data.message || data.error || "Could not change booking");
      return;
    }
    setInquiryBooking(data.booking);
    setInquiryMessage("Booking changed successfully.");
  }

  async function deleteInquiryBooking() {
    if (!inquiryBooking?.id) return;
    const res = await fetch("/api/bookings/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: inquiryBooking.id,
        reason: "Deleted from booking inquiry",
        actor: "passenger",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setInquiryMessage(data.error || "Could not delete booking");
      return;
    }
    setInquiryBooking(data);
    setInquiryMessage("Booking deleted/cancelled successfully.");
  }

  return (
    <WorkflowShell>
    <div className="min-h-screen bg-[#fcf9f8] text-[#1A1A1A]">
      <div className="bg-[#410001] py-12 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white mb-2">Booking Creation</h1>
          <p className="text-white/80">
            Secure your flight and passenger details seamlessly.
          </p>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pb-12">
      <div className="grid gap-6 md:grid-cols-2 bg-white p-6 sm:p-8 rounded-2xl shadow-[0_12px_32px_rgba(13,13,13,0.08)] border border-[#e5e2e1] mb-8">
        <label className="space-y-2">
          <span className="block text-sm font-semibold text-[#5e3f3c]">Flight</span>
          <select
            className="w-full rounded-lg border border-[#e5e2e1] p-3 focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-[#fcf9f8]"
            value={selectedFlightId}
            onChange={(e) => setSelectedFlightId(e.target.value)}
          >
            {flights.map((flight) => (
              <option key={flight.id} value={flight.id}>
                {flight.flightNumber} - {flight.origin} to {flight.destination}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="block text-sm font-semibold text-[#5e3f3c]">Booking Class</span>
          <select
            className="w-full rounded-lg border border-[#e5e2e1] p-3 focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-[#fcf9f8]"
            value={seatClass}
            onChange={(e) => setSeatClass(e.target.value as any)}
          >
            {TRAVEL_CLASSES.map((entry) => (
              <option key={entry.code} value={entry.code}>{entry.label}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="block text-sm font-semibold text-[#5e3f3c]">Seat Count</span>
          <input
            className="w-full rounded-lg border border-[#e5e2e1] p-3 focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-[#fcf9f8]"
            type="number"
            min={1}
            value={seatCount}
            onChange={(e) => setSeatCount(Number(e.target.value))}
          />
        </label>

        <label className="space-y-2">
          <span className="block text-sm font-semibold text-[#5e3f3c]">Promo Code</span>
          <input
            className="w-full rounded-lg border border-[#e5e2e1] p-3 focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-[#fcf9f8]"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Optional"
          />
        </label>

        <label className="space-y-2">
          <span className="block text-sm font-semibold text-[#5e3f3c]">Contact Email</span>
          <input
            className="w-full rounded-lg border border-[#e5e2e1] p-3 focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-[#fcf9f8]"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="Optional"
          />
        </label>

        <label className="space-y-2">
          <span className="block text-sm font-semibold text-[#5e3f3c]">Contact Phone</span>
          <input
            className="w-full rounded-lg border border-[#e5e2e1] p-3 focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-[#fcf9f8]"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="Optional"
          />
        </label>
      </div>

      <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_12px_32px_rgba(13,13,13,0.08)] border border-[#e5e2e1]">
        <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Seat Capacity by Class</h2>
        <div className="grid gap-4 md:grid-cols-3" aria-live="polite">
          {(availability?.classes || []).map((entry: any) => (
            <div
              key={entry.code}
              className={`rounded-xl border p-4 ${entry.isFull ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}
            >
              <div className="text-sm font-bold text-[#1A1A1A]">{entry.label}</div>
              <div className="mt-2 text-2xl font-black">{entry.available}/{entry.capacity}</div>
              <div className="text-xs font-semibold text-[#5e3f3c] mt-1">
                {entry.isFull ? "FULL" : "seats available"}
              </div>
            </div>
          ))}
        </div>
        {availability?.selected?.isFull ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            This class is full.
            {availability.nextAvailable ? (
              <span> Next available: {availability.nextAvailable.flightNumber} on {new Date(availability.nextAvailable.departureTime).toLocaleString()}.</span>
            ) : (
              <span> No later available flight was found for this route.</span>
            )}
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_12px_32px_rgba(13,13,13,0.08)] border border-[#e5e2e1]">
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Saved Passengers</h2>
          <div className="space-y-3 max-h-96 overflow-auto pr-2">
            {profiles.length === 0 ? (
              <p className="text-sm text-[#5e3f3c]">
                No saved passengers found.
              </p>
            ) : (
              profiles.map((profile) => {
                const passportReady = hasRequiredPassportDetails({
                  passportNo: profile.passportNo,
                  nationality: profile.nationality,
                });

                return (
                  <div
                    key={profile.id}
                    className={`flex items-start gap-4 rounded-xl border p-4 cursor-pointer transition-all ${
                      selectedProfileIds.includes(profile.id)
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-[#e5e2e1] hover:border-[#d7d3d2] hover:bg-[#fcf9f8]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 w-4 h-4 text-primary focus:ring-primary border-[#e5e2e1] rounded cursor-pointer"
                      checked={selectedProfileIds.includes(profile.id)}
                      onChange={() => toggleProfile(profile.id)}
                      aria-label={`Select ${profile.firstName} ${profile.lastName}`}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block font-bold text-[#1A1A1A]">
                        {profile.firstName} {profile.lastName}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#5e3f3c]">
                        <span>{profile.passportNo || "No passport"}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            passportReady
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-[#c8102e]"
                          }`}
                        >
                          {passportReady ? "Ready" : "Required"}
                        </span>
                        {profile.vipLabel ? ` • ${profile.vipLabel}` : ""}
                      </span>
                      {!passportReady ? (
                        <button
                          type="button"
                          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary bg-white px-3 py-2 text-xs font-bold text-primary hover:bg-primary/5"
                          onClick={() => generatePassportForProfile(profile)}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            auto_awesome
                          </span>
                          Generate passport details
                        </button>
                      ) : null}
                      {accessibilityNeedsSummary(
                        profile.accessibilityNeeds ||
                          profile.travelPreferences?.accessibilityNeeds ||
                          null,
                      ) ? (
                        <span className="block text-sm text-primary mt-1">
                          <span className="font-semibold">Accessibility:</span>{" "}
                          {accessibilityNeedsSummary(
                            profile.accessibilityNeeds ||
                              profile.travelPreferences?.accessibilityNeeds ||
                              null,
                          )}
                        </span>
                      ) : null}
                      {profile.tags?.length ? (
                        <span className="block text-xs text-[#5e3f3c] mt-2 bg-[#f6f3f2] px-2 py-1 rounded w-fit">
                          Tags: {profile.tags.join(", ")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_12px_32px_rgba(13,13,13,0.08)] border border-[#e5e2e1]">
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Add Draft Passenger</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              className="w-full px-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-[#fcf9f8]"
              placeholder="First name"
              value={draftPassenger.firstName}
              onChange={(e) =>
                setDraftPassenger({
                  ...draftPassenger,
                  firstName: e.target.value,
                })
              }
            />
            <input
              className="w-full px-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-[#fcf9f8]"
              placeholder="Last name"
              value={draftPassenger.lastName}
              onChange={(e) =>
                setDraftPassenger({
                  ...draftPassenger,
                  lastName: e.target.value,
                })
              }
            />
          </div>
          <div className="mt-4">
            <PassportRequirementPanel
              compact
              firstName={draftPassenger.firstName}
              lastName={draftPassenger.lastName}
              passportNo={draftPassenger.passportNo}
              nationality={draftPassenger.nationality}
              dateOfBirth={draftPassenger.dateOfBirth}
              onChange={(patch) =>
                setDraftPassenger((current) => ({
                  ...current,
                  ...patch,
                  passportDetails:
                    patch.passportDetails || current.passportDetails,
                }))
              }
            />
          </div>
          <div className="mt-6 space-y-4 rounded-xl border border-[#e5e2e1] bg-[#fcf9f8] p-5">
            <p className="text-sm font-bold text-[#1A1A1A]">Accessibility & Special Needs</p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm text-[#5e3f3c] cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary focus:ring-primary border-[#e5e2e1] rounded cursor-pointer"
                  checked={
                    draftPassenger.accessibilityNeeds.wheelchairAssistance
                  }
                  onChange={(e) =>
                    updateDraftAccessibility({
                      wheelchairAssistance: e.target.checked,
                    })
                  }
                />
                Wheelchair assistance
              </label>
              <label className="flex items-center gap-2 text-sm text-[#5e3f3c] cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary focus:ring-primary border-[#e5e2e1] rounded cursor-pointer"
                  checked={
                    draftPassenger.accessibilityNeeds.visualImpairmentAssistance
                  }
                  onChange={(e) =>
                    updateDraftAccessibility({
                      visualImpairmentAssistance: e.target.checked,
                    })
                  }
                />
                Visual impairment assistance
              </label>
              <label className="flex items-center gap-2 text-sm text-[#5e3f3c] cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary focus:ring-primary border-[#e5e2e1] rounded cursor-pointer"
                  checked={
                    draftPassenger.accessibilityNeeds
                      .hearingImpairmentAssistance
                  }
                  onChange={(e) =>
                    updateDraftAccessibility({
                      hearingImpairmentAssistance: e.target.checked,
                    })
                  }
                />
                Hearing impairment assistance
              </label>
              <label className="flex items-center gap-2 text-sm text-[#5e3f3c] cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary focus:ring-primary border-[#e5e2e1] rounded cursor-pointer"
                  checked={draftPassenger.accessibilityNeeds.accessibleSeating}
                  onChange={(e) =>
                    updateDraftAccessibility({
                      accessibleSeating: e.target.checked,
                    })
                  }
                />
                Accessible seating
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-white"
                placeholder="Medical assistance request"
                value={
                  draftPassenger.accessibilityNeeds.medicalAssistance || ""
                }
                onChange={(e) =>
                  updateDraftAccessibility({
                    medicalAssistance: e.target.value,
                  })
                }
              />
              <input
                className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-white"
                placeholder="Special meal request"
                value={
                  draftPassenger.accessibilityNeeds.specialMealRequest || ""
                }
                onChange={(e) =>
                  updateDraftAccessibility({
                    specialMealRequest: e.target.value,
                  })
                }
              />
              <label className="flex items-center gap-2 rounded-lg border border-[#e5e2e1] bg-white p-2 text-sm text-[#5e3f3c] cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary focus:ring-primary border-[#e5e2e1] rounded cursor-pointer"
                  checked={
                    draftPassenger.accessibilityNeeds.companionSupport
                      ?.required ?? false
                  }
                  onChange={(e) =>
                    updateDraftAccessibility({
                      companionSupport: { required: e.target.checked },
                    })
                  }
                />
                Companion support required
              </label>
              <input
                className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-white"
                type="number"
                min={0}
                placeholder="Companion count"
                value={
                  draftPassenger.accessibilityNeeds.companionSupport
                    ?.companionCount || 0
                }
                onChange={(e) =>
                  updateDraftAccessibility({
                    companionSupport: {
                      companionCount: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
            <textarea
              className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-white"
              rows={2}
              placeholder="Accessibility notes"
              value={draftPassenger.accessibilityNeeds.notes || ""}
              onChange={(e) =>
                updateDraftAccessibility({ notes: e.target.value })
              }
            />
            <input
              className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-white"
              placeholder="Companion support notes"
              value={
                draftPassenger.accessibilityNeeds.companionSupport?.notes || ""
              }
              onChange={(e) =>
                updateDraftAccessibility({
                  companionSupport: { notes: e.target.value },
                })
              }
            />
          </div>
          <button
            type="button"
            className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-primary px-4 py-3 font-semibold text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={addDraftPassenger}
            disabled={
              !draftPassenger.firstName ||
              !draftPassenger.lastName ||
              !hasRequiredPassportDetails({
                passportNo: draftPassenger.passportNo,
                nationality: draftPassenger.nationality,
              })
            }
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add Draft Passenger
          </button>

          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-bold text-[#1A1A1A]">Draft Passengers Queue</h3>
            {draftPassengers.length === 0 ? (
              <p className="text-sm text-[#5e3f3c]">None added yet.</p>
            ) : (
              <div className="space-y-2">
                {draftPassengers.map((passenger, index) => (
                  <div
                    key={`${passenger.firstName}-${index}`}
                    className="rounded-xl border border-primary bg-primary/5 p-4 text-sm"
                  >
                    <span className="font-bold text-[#1A1A1A]">{passenger.firstName} {passenger.lastName}</span> •{" "}
                    <span className="text-[#5e3f3c]">
                      {passenger.passportNo || "No passport"} · {passenger.nationality || "No nationality"}
                    </span>
                    {accessibilityNeedsSummary(
                      passenger.accessibilityNeeds || null,
                    ) ? (
                      <span className="block text-xs font-semibold text-primary mt-1">
                        Needs: {accessibilityNeedsSummary(passenger.accessibilityNeeds)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_12px_32px_rgba(13,13,13,0.08)] border border-[#e5e2e1]">
        <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Booking Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <div>
            <span className="block text-xs text-[#5e3f3c] uppercase tracking-wider mb-1">Flight</span>
            <span className="font-semibold text-[#1A1A1A]">{selectedFlightId || "none selected"}</span>
          </div>
          <div>
            <span className="block text-xs text-[#5e3f3c] uppercase tracking-wider mb-1">Booking Class</span>
            <span className="font-semibold text-[#1A1A1A]">
              {TRAVEL_CLASSES.find((entry) => entry.code === seatClass)?.label}
            </span>
          </div>
          <div>
            <span className="block text-xs text-[#5e3f3c] uppercase tracking-wider mb-1">Seat Count</span>
            <span className="font-semibold text-[#1A1A1A]">{seatCount}</span>
          </div>
          <div>
            <span className="block text-xs text-[#5e3f3c] uppercase tracking-wider mb-1">Total Passengers</span>
            <span className="font-semibold text-[#1A1A1A]">
              {selectedProfiles.length + draftPassengers.length || seatCount}
            </span>
          </div>
        </div>
        <div
          className={`mb-6 rounded-xl border p-4 text-sm font-semibold ${
            passportRequirementSatisfied
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-100 bg-red-50 text-[#c8102e]"
          }`}
        >
          {passportRequirementSatisfied
            ? "Passport check complete for every passenger."
            : "Select or add passengers, then complete passport details before creating the booking hold."}
        </div>
        
        <button
          type="button"
          disabled={loading || (!selectedFlightId) || availability?.selected?.isFull || !passportRequirementSatisfied}
          className="w-full sm:w-auto px-8 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-[#e71520] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          onClick={createHold}
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Create Booking Hold
              <span className="material-symbols-outlined text-[18px]">airplane_ticket</span>
            </>
          )}
        </button>
        {error ? <p className="mt-4 text-sm font-semibold text-[#c8102e] bg-red-50 p-3 rounded-lg border border-red-100">{error}</p> : null}
        {hold ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-emerald-600">check_circle</span>
              <p className="font-bold text-emerald-800 text-lg">Hold Successfully Created</p>
            </div>
            <div className="grid gap-2 text-sm text-emerald-700">
              <p><span className="font-medium">Hold ID:</span> {hold.holdId}</p>
              <p><span className="font-medium">Expires:</span> {new Date(hold.expiresAt).toLocaleString()}</p>
              <p><span className="font-medium">Total:</span> {hold.fare?.total ?? "n/a"}</p>
            </div>
            <button
              type="button"
              className="mt-4 px-6 py-3 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-800"
              onClick={confirmHold}
              disabled={loading}
            >
              Process Payment & Print Ticket
            </button>
          </div>
        ) : null}
        {confirmed ? (
          <div className="mt-6 rounded-xl border border-[#d8c36a] bg-[#fff9d8] p-6">
            <p className="font-bold text-[#1A1A1A] text-lg">Ticket Processed Successfully</p>
            <p className="text-sm text-[#5e3f3c] mt-2">
              Reference: <span className="font-mono font-bold">{confirmed.receipt?.reference}</span>
            </p>
            <button className="mt-4 px-6 py-3 rounded-lg bg-[#1A1A1A] text-white font-bold" onClick={() => window.print()}>
              Print Ticket Report
            </button>
          </div>
        ) : null}
      </section>

      <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_12px_32px_rgba(13,13,13,0.08)] border border-[#e5e2e1]">
        <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Booking Inquiry</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="flex-1 px-4 py-3 rounded-lg border border-[#e5e2e1] text-[#1A1A1A]"
            placeholder="Enter booking reference or ID"
            value={inquiryRef}
            onChange={(e) => setInquiryRef(e.target.value)}
          />
          <button className="px-6 py-3 rounded-lg bg-[#1A1A1A] text-white font-bold" onClick={lookupBooking}>
            Add booking inquiry
          </button>
        </div>
        {inquiryMessage ? <p className="mt-3 text-sm font-semibold text-primary">{inquiryMessage}</p> : null}
        {inquiryBooking ? (
          <div className="mt-5 rounded-xl border border-[#e5e2e1] bg-[#fcf9f8] p-5">
            <div className="grid gap-2 md:grid-cols-3 text-sm">
              <p><span className="font-bold">Reference:</span> {inquiryBooking.reference}</p>
              <p><span className="font-bold">Status:</span> {inquiryBooking.status}</p>
              <p><span className="font-bold">Class:</span> {inquiryBooking.travelClass?.label}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {TRAVEL_CLASSES.map((entry) => (
                <button
                  key={entry.code}
                  className="px-4 py-2 rounded-lg border border-[#e5e2e1] bg-white text-sm font-bold"
                  onClick={() => changeInquiryBooking(entry.code)}
                >
                  Change booking to {entry.shortCode || entry.label}
                </button>
              ))}
              <button
                className="px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-[#c8102e] text-sm font-bold"
                onClick={deleteInquiryBooking}
              >
                Delete booking
              </button>
            </div>
          </div>
        ) : null}
      </section>
      </div>
    </div>
    </WorkflowShell>
  );
}
