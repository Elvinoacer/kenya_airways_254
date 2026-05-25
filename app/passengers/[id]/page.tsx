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

  if (loading) return (
    <div className="min-h-screen bg-[#fcf9f8] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (error) return (
    <div className="min-h-screen bg-[#fcf9f8] p-8 flex items-center justify-center text-[#c8102e] font-semibold">
      {error}
    </div>
  );
  if (!passenger) return (
    <div className="min-h-screen bg-[#fcf9f8] p-8 flex items-center justify-center text-[#1A1A1A] font-semibold">
      Passenger not found.
    </div>
  );

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
      router.back();
    } catch (e: any) {
      setError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fcf9f8] text-[#1A1A1A]">
      <div className="bg-[#410001] py-12 mb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4 text-sm font-semibold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Passengers
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">Edit Passenger Profile</h1>
          <p className="text-white/80">
            Update personal details and accessibility requirements.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pb-12">
        {error ? <div className="p-4 bg-red-50 text-[#c8102e] border border-red-200 rounded-xl font-semibold">{error}</div> : null}

        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-[0_12px_32px_rgba(13,13,13,0.08)] border border-[#e5e2e1] space-y-6">
          <h2 className="text-xl font-bold text-[#1A1A1A]">Personal Details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[#5e3f3c] mb-1">First Name</label>
              <input
                className="w-full px-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-[#fcf9f8]"
                value={passenger.firstName}
                onChange={(e) =>
                  setPassenger({ ...passenger, firstName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5e3f3c] mb-1">Last Name</label>
              <input
                className="w-full px-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-[#fcf9f8]"
                value={passenger.lastName}
                onChange={(e) =>
                  setPassenger({ ...passenger, lastName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5e3f3c] mb-1">Passport Number</label>
              <input
                className="w-full px-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-[#fcf9f8]"
                value={passenger.passportNo || ""}
                onChange={(e) =>
                  setPassenger({ ...passenger, passportNo: e.target.value || null })
                }
                placeholder="Passport no."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5e3f3c] mb-1">Nationality</label>
              <input
                className="w-full px-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-[#fcf9f8]"
                value={passenger.nationality || ""}
                onChange={(e) =>
                  setPassenger({ ...passenger, nationality: e.target.value || null })
                }
                placeholder="Nationality"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5e3f3c] mb-1">Phone</label>
              <input
                className="w-full px-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-[#fcf9f8]"
                value={passenger.phone || ""}
                onChange={(e) =>
                  setPassenger({ ...passenger, phone: e.target.value || null })
                }
                placeholder="Phone"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5e3f3c] mb-1">VIP Label</label>
              <input
                className="w-full px-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-[#fcf9f8]"
                value={passenger.vipLabel || ""}
                onChange={(e) =>
                  setPassenger({ ...passenger, vipLabel: e.target.value || null })
                }
                placeholder="VIP label"
              />
            </div>
          </div>
        </div>

        <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-[0_12px_32px_rgba(13,13,13,0.08)] border border-[#e5e2e1] space-y-6">
          <div>
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">Accessibility & Special Needs</h2>
            <p className="text-sm text-[#5e3f3c]">Document any assistance required during the journey.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 p-5 bg-[#fcf9f8] rounded-xl border border-[#e5e2e1]">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-primary focus:ring-primary border-[#e5e2e1] rounded cursor-pointer"
                checked={Boolean(
                  passenger.accessibilityNeeds?.wheelchairAssistance,
                )}
                onChange={(e) =>
                  updateAccessibility({ wheelchairAssistance: e.target.checked })
                }
              />
              <span className="text-sm font-semibold text-[#1A1A1A]">Wheelchair assistance</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-primary focus:ring-primary border-[#e5e2e1] rounded cursor-pointer"
                checked={Boolean(
                  passenger.accessibilityNeeds?.visualImpairmentAssistance,
                )}
                onChange={(e) =>
                  updateAccessibility({
                    visualImpairmentAssistance: e.target.checked,
                  })
                }
              />
              <span className="text-sm font-semibold text-[#1A1A1A]">Visual impairment assistance</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-primary focus:ring-primary border-[#e5e2e1] rounded cursor-pointer"
                checked={Boolean(
                  passenger.accessibilityNeeds?.hearingImpairmentAssistance,
                )}
                onChange={(e) =>
                  updateAccessibility({
                    hearingImpairmentAssistance: e.target.checked,
                  })
                }
              />
              <span className="text-sm font-semibold text-[#1A1A1A]">Hearing impairment assistance</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-primary focus:ring-primary border-[#e5e2e1] rounded cursor-pointer"
                checked={Boolean(passenger.accessibilityNeeds?.accessibleSeating)}
                onChange={(e) =>
                  updateAccessibility({ accessibleSeating: e.target.checked })
                }
              />
              <span className="text-sm font-semibold text-[#1A1A1A]">Accessible seating</span>
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[#5e3f3c] mb-1">Medical Assistance Request</label>
              <input
                className="w-full px-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-[#fcf9f8]"
                placeholder="Optional"
                value={passenger.accessibilityNeeds?.medicalAssistance || ""}
                onChange={(e) =>
                  updateAccessibility({ medicalAssistance: e.target.value || null })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5e3f3c] mb-1">Special Meal Request</label>
              <input
                className="w-full px-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-[#fcf9f8]"
                placeholder="Optional"
                value={passenger.accessibilityNeeds?.specialMealRequest || ""}
                onChange={(e) =>
                  updateAccessibility({
                    specialMealRequest: e.target.value || null,
                  })
                }
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer bg-[#fcf9f8] border border-[#e5e2e1] px-4 py-2.5 rounded-lg w-full">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary focus:ring-primary border-[#e5e2e1] rounded cursor-pointer"
                  checked={Boolean(
                    passenger.accessibilityNeeds?.companionSupport?.required,
                  )}
                  onChange={(e) =>
                    updateAccessibility({
                      companionSupport: { required: e.target.checked },
                    })
                  }
                />
                <span className="text-sm font-semibold text-[#1A1A1A]">Companion support required</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5e3f3c] mb-1">Companion Count</label>
              <input
                className="w-full px-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-[#fcf9f8]"
                type="number"
                min={0}
                placeholder="0"
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
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5e3f3c] mb-1">Accessibility Notes</label>
            <textarea
              className="w-full px-4 py-3 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A] bg-[#fcf9f8]"
              rows={3}
              placeholder="Any additional details..."
              value={passenger.accessibilityNeeds?.notes || ""}
              onChange={(e) =>
                updateAccessibility({ notes: e.target.value || null })
              }
            />
          </div>
          
          {accessibilityNeedsSummary(passenger.accessibilityNeeds || null) && (
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl text-sm">
              <span className="font-bold text-primary mr-2">Summary:</span>
              <span className="text-[#5e3f3c]">
                {accessibilityNeedsSummary(passenger.accessibilityNeeds || null)}
              </span>
            </div>
          )}
        </section>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-[#e5e2e1]">
          <button
            className="w-full sm:w-auto px-8 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-[#e71520] transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            onClick={save}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Save Changes
                <span className="material-symbols-outlined text-[18px]">save</span>
              </>
            )}
          </button>
          <button
            className="w-full sm:w-auto px-8 py-3 rounded-lg border border-[#e5e2e1] text-[#1A1A1A] font-semibold hover:bg-[#fcf9f8] transition-colors cursor-pointer"
            onClick={() => router.back()}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
