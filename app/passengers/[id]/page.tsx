"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  accessibilityNeedsSummary,
  type AccessibilityNeeds,
} from "../../../lib/accessibility";

type Passenger = {
  id: string;
  firstName: string;
  lastName: string;
  passportNo?: string | null;
  nationality?: string | null;
  phone?: string | null;
  travelPreferences?: Record<string, any>;
  accessibilityNeeds?: AccessibilityNeeds | null;
  notes?: string | null;
  vipLabel?: string | null;
};

export default function PassengerEditPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [passenger, setPassenger] = useState<Passenger | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/passengers/${params.id}`);
        if (!res.ok) throw new Error("Failed to load passenger");
        const data = await res.json();
        setPassenger(data.passenger || null);
      } catch (e: any) {
        setError(e.message || "Error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!passenger) return <div className="p-6">Passenger not found.</div>;

  function updateAccessibility(
    patch: Partial<AccessibilityNeeds> & {
      companionSupport?: Partial<
        NonNullable<AccessibilityNeeds["companionSupport"]>
      >;
    },
  ) {
    setPassenger((p) => ({
      ...(p as Passenger),
      accessibilityNeeds: {
        ...((p?.accessibilityNeeds as any) || {}),
        ...patch,
        companionSupport: {
          ...((p?.accessibilityNeeds as any)?.companionSupport || {}),
          ...patch.companionSupport,
        },
      },
    }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/passengers/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passenger),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      // refresh or navigate back
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Edit Passenger</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          className="rounded border p-2"
          value={passenger.firstName}
          onChange={(e) =>
            setPassenger({ ...passenger, firstName: e.target.value })
          }
        />
        <input
          className="rounded border p-2"
          value={passenger.lastName}
          onChange={(e) =>
            setPassenger({ ...passenger, lastName: e.target.value })
          }
        />
        <input
          className="rounded border p-2"
          value={passenger.passportNo || ""}
          onChange={(e) =>
            setPassenger({ ...passenger, passportNo: e.target.value || null })
          }
          placeholder="Passport no."
        />
        <input
          className="rounded border p-2"
          value={passenger.nationality || ""}
          onChange={(e) =>
            setPassenger({ ...passenger, nationality: e.target.value || null })
          }
          placeholder="Nationality"
        />
        <input
          className="rounded border p-2"
          value={passenger.phone || ""}
          onChange={(e) =>
            setPassenger({ ...passenger, phone: e.target.value || null })
          }
          placeholder="Phone"
        />
        <input
          className="rounded border p-2"
          value={passenger.vipLabel || ""}
          onChange={(e) =>
            setPassenger({ ...passenger, vipLabel: e.target.value || null })
          }
          placeholder="VIP label"
        />
      </div>

      <section className="rounded border p-4 space-y-2">
        <h2 className="font-medium">Accessibility & special needs</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(
                passenger.accessibilityNeeds?.wheelchairAssistance,
              )}
              onChange={(e) =>
                updateAccessibility({ wheelchairAssistance: e.target.checked })
              }
            />{" "}
            Wheelchair assistance
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(
                passenger.accessibilityNeeds?.visualImpairmentAssistance,
              )}
              onChange={(e) =>
                updateAccessibility({
                  visualImpairmentAssistance: e.target.checked,
                })
              }
            />{" "}
            Visual impairment assistance
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(
                passenger.accessibilityNeeds?.hearingImpairmentAssistance,
              )}
              onChange={(e) =>
                updateAccessibility({
                  hearingImpairmentAssistance: e.target.checked,
                })
              }
            />{" "}
            Hearing impairment assistance
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(passenger.accessibilityNeeds?.accessibleSeating)}
              onChange={(e) =>
                updateAccessibility({ accessibleSeating: e.target.checked })
              }
            />{" "}
            Accessible seating
          </label>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="rounded border p-2"
            placeholder="Medical assistance"
            value={passenger.accessibilityNeeds?.medicalAssistance || ""}
            onChange={(e) =>
              updateAccessibility({ medicalAssistance: e.target.value || null })
            }
          />
          <input
            className="rounded border p-2"
            placeholder="Special meal request"
            value={passenger.accessibilityNeeds?.specialMealRequest || ""}
            onChange={(e) =>
              updateAccessibility({
                specialMealRequest: e.target.value || null,
              })
            }
          />
          <label className="flex items-center gap-2 rounded border p-2">
            <input
              type="checkbox"
              checked={Boolean(
                passenger.accessibilityNeeds?.companionSupport?.required,
              )}
              onChange={(e) =>
                updateAccessibility({
                  companionSupport: { required: e.target.checked },
                })
              }
            />{" "}
            Companion support required
          </label>
          <input
            className="rounded border p-2"
            type="number"
            min={0}
            placeholder="Companion count"
            value={
              passenger.accessibilityNeeds?.companionSupport?.companionCount ||
              0
            }
            onChange={(e) =>
              updateAccessibility({
                companionSupport: { companionCount: Number(e.target.value) },
              })
            }
          />
        </div>
        <textarea
          className="w-full rounded border p-2"
          rows={3}
          placeholder="Accessibility notes"
          value={passenger.accessibilityNeeds?.notes || ""}
          onChange={(e) =>
            updateAccessibility({ notes: e.target.value || null })
          }
        />
        <div className="text-sm text-slate-600">
          Summary:{" "}
          {accessibilityNeedsSummary(passenger.accessibilityNeeds || null)}
        </div>
      </section>

      <div className="flex gap-3">
        <button
          className="rounded bg-blue-600 px-4 py-2 text-white"
          onClick={save}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          className="rounded border px-4 py-2"
          onClick={() => router.back()}
        >
          Cancel
        </button>
      </div>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
    </div>
  );
}
