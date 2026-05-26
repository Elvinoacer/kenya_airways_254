"use client";

import {
  createKenyanPassportDetails,
  hasRequiredPassportDetails,
  type PassportDetails,
} from "@/lib/passport";

type PassportRequirementPanelProps = {
  firstName?: string;
  lastName?: string;
  passportNo: string;
  nationality: string;
  dateOfBirth?: string;
  dateRequired?: boolean;
  maxDateOfBirth?: string;
  compact?: boolean;
  onChange: (patch: {
    passportNo?: string;
    nationality?: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    passportDetails?: PassportDetails;
  }) => void;
};

export default function PassportRequirementPanel({
  firstName,
  lastName,
  passportNo,
  nationality,
  dateOfBirth,
  dateRequired = false,
  maxDateOfBirth,
  compact = false,
  onChange,
}: PassportRequirementPanelProps) {
  const ready = hasRequiredPassportDetails({ passportNo, nationality });

  function generatePassport() {
    const details = createKenyanPassportDetails({
      passportNo: passportNo || undefined,
      nationality: nationality || undefined,
    });
    onChange({
      passportNo: details.passportNo,
      nationality: details.nationality,
      placeOfBirth: details.placeOfBirth,
      passportDetails: details,
    });
  }

  return (
    <section className="rounded-xl border border-[#e5e2e1] bg-[#fcf9f8] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`material-symbols-outlined text-[20px] ${
                ready ? "text-emerald-700" : "text-primary"
              }`}
            >
              {ready ? "verified" : "badge"}
            </span>
            <h3 className="text-base font-bold text-[#1A1A1A]">
              Passport details
            </h3>
          </div>
          <p className="mt-1 text-sm text-[#5e3f3c]">
            {ready
              ? "This passenger can continue to booking."
              : "A passport number and nationality are required before booking."}
          </p>
        </div>
        <button
          type="button"
          onClick={generatePassport}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-white px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/5"
        >
          <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
          Generate Kenyan details
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="block text-sm font-semibold text-[#5e3f3c]">
            Passport number
          </span>
          <input
            className="w-full rounded-lg border border-[#e5e2e1] bg-white px-4 py-2.5 text-[#1A1A1A] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={passportNo}
            onChange={(event) =>
              onChange({ passportNo: event.target.value.toUpperCase() })
            }
            placeholder="AK1234567"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-sm font-semibold text-[#5e3f3c]">
            Nationality
          </span>
          <input
            className="w-full rounded-lg border border-[#e5e2e1] bg-white px-4 py-2.5 text-[#1A1A1A] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            value={nationality}
            onChange={(event) => onChange({ nationality: event.target.value })}
            placeholder="Kenyan"
          />
        </label>
        {!compact ? (
          <label className="space-y-1 sm:col-span-2">
            <span className="block text-sm font-semibold text-[#5e3f3c]">
              Date of birth
            </span>
            <input
              type="date"
              required={dateRequired}
              max={maxDateOfBirth}
              className="w-full rounded-lg border border-[#e5e2e1] bg-white px-4 py-2.5 text-[#1A1A1A] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              value={dateOfBirth || ""}
              onChange={(event) => onChange({ dateOfBirth: event.target.value })}
            />
          </label>
        ) : null}
      </div>

      <div className="mt-4 rounded-lg border border-[#e5e2e1] bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-[#5e3f3c]">
              Republic of Kenya
            </p>
            <p className="mt-1 text-lg font-black text-[#1A1A1A]">
              {passportNo || "AK1234567"}
            </p>
          </div>
          <div
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              ready
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-[#c8102e]"
            }`}
          >
            {ready ? "Ready" : "Required"}
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-sm text-[#5e3f3c] sm:grid-cols-3">
          <span>{firstName || "First name"}</span>
          <span>{lastName || "Last name"}</span>
          <span>{nationality || "Kenyan"}</span>
        </div>
      </div>
    </section>
  );
}
