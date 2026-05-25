"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  accessibilityNeedsSummary,
  type AccessibilityNeeds,
} from "../../lib/accessibility";

type PassengerProfile = {
  id: string;
  firstName: string;
  lastName: string;
  passportNo?: string | null;
  nationality?: string | null;
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
};

export default function BookingPage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [profiles, setProfiles] = useState<PassengerProfile[]>([]);
  const [selectedFlightId, setSelectedFlightId] = useState("");
  const [seatClass, setSeatClass] = useState<
    "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST"
  >("ECONOMY");
  const [seatCount, setSeatCount] = useState(1);
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [draftPassengers, setDraftPassengers] = useState<DraftPassenger[]>([]);
  const [draftPassenger, setDraftPassenger] = useState<DraftPassenger>({
    firstName: "",
    lastName: "",
    passportNo: "",
    nationality: "",
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
      if (!selectedFlightId && flightsData.results?.[0]?.id)
        setSelectedFlightId(flightsData.results[0].id);
    }
    load().catch((err) =>
      setError(err.message || "Failed to load booking data"),
    );
  }, []);

  const selectedProfiles = useMemo(
    () => profiles.filter((profile) => selectedProfileIds.includes(profile.id)),
    [profiles, selectedProfileIds],
  );

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
      nationality: "",
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

  async function createHold() {
    setLoading(true);
    setError("");
    setHold(null);
    try {
      const passengerCount = selectedProfileIds.length + draftPassengers.length;
      const payload = {
        flightId: selectedFlightId,
        seatClass,
        seats: passengerCount > 0 ? passengerCount : seatCount,
        passengerProfileIds: selectedProfileIds,
        passengers: draftPassengers.map((passenger, index) => ({
          id: `draft-${index}-${Date.now()}`,
          firstName: passenger.firstName,
          lastName: passenger.lastName,
          passportNo: passenger.passportNo,
          nationality: passenger.nationality,
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
      setHold(data);
    } catch (err: any) {
      setError(err.message || "Failed to create booking hold");
    } finally {
      setLoading(false);
    }
  }

  return (
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
          <span className="block text-sm font-semibold text-[#5e3f3c]">Seat Class</span>
          <select
            className="w-full rounded-lg border border-[#e5e2e1] p-3 focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-[#fcf9f8]"
            value={seatClass}
            onChange={(e) => setSeatClass(e.target.value as any)}
          >
            <option value="ECONOMY">Economy</option>
            <option value="PREMIUM_ECONOMY">Premium Economy</option>
            <option value="BUSINESS">Business</option>
            <option value="FIRST">First</option>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_12px_32px_rgba(13,13,13,0.08)] border border-[#e5e2e1]">
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-4">Saved Passengers</h2>
          <div className="space-y-3 max-h-96 overflow-auto pr-2">
            {profiles.length === 0 ? (
              <p className="text-sm text-[#5e3f3c]">
                No saved passengers found.
              </p>
            ) : (
              profiles.map((profile) => (
                <label
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
                  />
                  <span>
                    <span className="block font-bold text-[#1A1A1A]">
                      {profile.firstName} {profile.lastName}
                    </span>
                    <span className="block text-sm text-[#5e3f3c] mt-1">
                      {profile.passportNo || "No passport"}
                      {profile.vipLabel ? ` • ${profile.vipLabel}` : ""}
                    </span>
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
                  </span>
                </label>
              ))
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
            <input
              className="w-full px-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-[#fcf9f8]"
              placeholder="Passport no."
              value={draftPassenger.passportNo}
              onChange={(e) =>
                setDraftPassenger({
                  ...draftPassenger,
                  passportNo: e.target.value,
                })
              }
            />
            <input
              className="w-full px-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-[#fcf9f8]"
              placeholder="Nationality"
              value={draftPassenger.nationality}
              onChange={(e) =>
                setDraftPassenger({
                  ...draftPassenger,
                  nationality: e.target.value,
                })
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
            className="mt-6 w-full py-3 px-4 rounded-lg border border-primary text-primary font-semibold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            onClick={addDraftPassenger}
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
                    <span className="text-[#5e3f3c]">{passenger.passportNo || "No passport"}</span>
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
            <span className="block text-xs text-[#5e3f3c] uppercase tracking-wider mb-1">Seat Class</span>
            <span className="font-semibold text-[#1A1A1A] capitalize">{seatClass.toLowerCase().replace('_', ' ')}</span>
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
        
        <button
          type="button"
          disabled={loading || (!selectedFlightId)}
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
          </div>
        ) : null}
      </section>
      </div>
    </div>
  );
}
