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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Booking Creation</h1>
        <p className="text-sm text-slate-500">
          Skeleton booking flow with saved passenger selection.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="block text-sm font-medium">Flight</span>
          <select
            className="w-full rounded border p-2"
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
          <span className="block text-sm font-medium">Seat Class</span>
          <select
            className="w-full rounded border p-2"
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
          <span className="block text-sm font-medium">Seat Count</span>
          <input
            className="w-full rounded border p-2"
            type="number"
            min={1}
            value={seatCount}
            onChange={(e) => setSeatCount(Number(e.target.value))}
          />
        </label>

        <label className="space-y-2">
          <span className="block text-sm font-medium">Promo Code</span>
          <input
            className="w-full rounded border p-2"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Optional"
          />
        </label>

        <label className="space-y-2">
          <span className="block text-sm font-medium">Contact Email</span>
          <input
            className="w-full rounded border p-2"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="Optional"
          />
        </label>

        <label className="space-y-2">
          <span className="block text-sm font-medium">Contact Phone</span>
          <input
            className="w-full rounded border p-2"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="Optional"
          />
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded border p-4">
          <h2 className="font-medium mb-3">Saved Passengers</h2>
          <div className="space-y-2 max-h-80 overflow-auto">
            {profiles.length === 0 ? (
              <p className="text-sm text-slate-500">
                No saved passengers found.
              </p>
            ) : (
              profiles.map((profile) => (
                <label
                  key={profile.id}
                  className="flex items-start gap-3 rounded border p-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedProfileIds.includes(profile.id)}
                    onChange={() => toggleProfile(profile.id)}
                  />
                  <span>
                    <span className="block font-medium">
                      {profile.firstName} {profile.lastName}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {profile.passportNo || "No passport"}
                      {profile.vipLabel ? ` • ${profile.vipLabel}` : ""}
                    </span>
                    {accessibilityNeedsSummary(
                      profile.accessibilityNeeds ||
                        profile.travelPreferences?.accessibilityNeeds ||
                        null,
                    ) ? (
                      <span className="block text-xs text-slate-500">
                        Accessibility:{" "}
                        {accessibilityNeedsSummary(
                          profile.accessibilityNeeds ||
                            profile.travelPreferences?.accessibilityNeeds ||
                            null,
                        )}
                      </span>
                    ) : null}
                    {profile.tags?.length ? (
                      <span className="block text-xs text-slate-500">
                        Tags: {profile.tags.join(", ")}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))
            )}
          </div>
        </section>

        <section className="rounded border p-4">
          <h2 className="font-medium mb-3">Add Passenger During Booking</h2>
          <div className="grid gap-2 md:grid-cols-2">
            <input
              className="rounded border p-2"
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
              className="rounded border p-2"
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
              className="rounded border p-2"
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
              className="rounded border p-2"
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
          <div className="mt-4 space-y-3 rounded border bg-slate-50 p-3">
            <p className="text-sm font-medium">Accessibility & special needs</p>
            <div className="grid gap-2 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
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
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
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
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
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
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
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
            <div className="grid gap-2 md:grid-cols-2">
              <input
                className="rounded border p-2"
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
                className="rounded border p-2"
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
              <label className="flex items-center gap-2 rounded border p-2 text-sm">
                <input
                  type="checkbox"
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
                className="rounded border p-2"
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
              className="w-full rounded border p-2"
              rows={3}
              placeholder="Accessibility notes"
              value={draftPassenger.accessibilityNeeds.notes || ""}
              onChange={(e) =>
                updateDraftAccessibility({ notes: e.target.value })
              }
            />
            <input
              className="w-full rounded border p-2"
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
            className="mt-3 rounded bg-slate-900 px-3 py-2 text-white"
            onClick={addDraftPassenger}
          >
            Add passenger
          </button>

          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium">Selected draft passengers</h3>
            {draftPassengers.length === 0 ? (
              <p className="text-sm text-slate-500">None added yet.</p>
            ) : (
              draftPassengers.map((passenger, index) => (
                <div
                  key={`${passenger.firstName}-${index}`}
                  className="rounded border p-2 text-sm"
                >
                  {passenger.firstName} {passenger.lastName} •{" "}
                  {passenger.passportNo || "No passport"}
                  {accessibilityNeedsSummary(
                    passenger.accessibilityNeeds || null,
                  ) ? (
                    <span className="block text-xs text-slate-500">
                      {accessibilityNeedsSummary(passenger.accessibilityNeeds)}
                    </span>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded border p-4">
        <h2 className="font-medium mb-2">Booking Summary</h2>
        <p className="text-sm">Flight: {selectedFlightId || "none selected"}</p>
        <p className="text-sm">Seat class: {seatClass}</p>
        <p className="text-sm">Seat count: {seatCount}</p>
        <p className="text-sm">
          Saved passengers selected: {selectedProfiles.length}
        </p>
        <p className="text-sm">
          Draft passengers added: {draftPassengers.length}
        </p>
        <p className="text-sm">
          Total passengers to book:{" "}
          {selectedProfiles.length + draftPassengers.length || seatCount}
        </p>
        <button
          type="button"
          disabled={loading}
          className="mt-3 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
          onClick={createHold}
        >
          {loading ? "Creating hold..." : "Create Booking Hold"}
        </button>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {hold ? (
          <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-sm">
            <p className="font-medium">Hold created</p>
            <p>Hold ID: {hold.holdId}</p>
            <p>Expires: {new Date(hold.expiresAt).toLocaleString()}</p>
            <p>Total: {hold.fare?.total ?? "n/a"}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
