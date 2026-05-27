"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onboardPassengerAction, logoutAction } from "../actions/auth-actions";
import PassportRequirementPanel from "../components/passport/PassportRequirementPanel";

const MAX_DATE_OF_BIRTH = new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0];

function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl");
  const callbackUrl =
    rawCallbackUrl?.startsWith("/") && !rawCallbackUrl.startsWith("//")
      ? rawCallbackUrl
      : "/dashboard";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [passportNo, setPassportNo] = useState("");
  const [nationality, setNationality] = useState("Kenyan");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await onboardPassengerAction(firstName, lastName, phone, passportNo, nationality, dateOfBirth);

      if (res.success) {
        setSuccess(res.message || "Profile onboarding complete!");
        setTimeout(() => {
          router.push(callbackUrl);
          router.refresh();
        }, 1500);
      } else {
        setError(res.error || "Onboarding failed.");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logoutAction();
    router.push(`/login?${new URLSearchParams({ callbackUrl }).toString()}`);
    router.refresh();
  };

  return (
    <div className="min-h-screen flex bg-[#fcf9f8]">
      {/* Left side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative bg-[#410001]">
        <img
          src="/images/auth_travel.svg"
          alt="Kenya Airways flight"
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full p-12 text-white">
          <span className="inline-block mb-8">
            <span className="text-3xl font-black tracking-wider text-white">
              KENYA <span className="text-primary">AIRWAYS</span>
            </span>
          </span>
          <h2 className="text-4xl font-semibold mb-4 leading-tight">Welcome Aboard.</h2>
          <p className="text-white/80 text-lg max-w-md">Let&apos;s get your details sorted before your next flight.</p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-16">
        <div className="w-full max-w-xl space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-[0_12px_32px_rgba(13,13,13,0.08)] border border-[#e5e2e1]">
          <div>
            <div className="flex justify-center lg:hidden mb-8">
              <span className="text-2xl font-black tracking-wider text-[#1A1A1A]">
                KENYA <span className="text-primary">AIRWAYS</span>
              </span>
            </div>
            <h2 className="text-3xl font-bold text-[#1A1A1A] mb-2">Complete Your Passenger Profile</h2>
            <p className="text-[#5e3f3c]">To comply with international flight security, please enter your details.</p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mb-6">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg mb-6">
              <p className="text-sm text-emerald-700 font-medium">{success}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-[#1A1A1A] mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-[#1A1A1A] bg-[#fcf9f8]"
                  placeholder="John"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-[#1A1A1A] mb-1">
                  Last / Family Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-[#1A1A1A] bg-[#fcf9f8]"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[#1A1A1A] mb-1">
                Phone Number (optional)
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-[#1A1A1A] bg-[#fcf9f8]"
                placeholder="+254 700 000000"
              />
            </div>

            <PassportRequirementPanel
              firstName={firstName}
              lastName={lastName}
              passportNo={passportNo}
              nationality={nationality}
              dateOfBirth={dateOfBirth}
              dateRequired
              maxDateOfBirth={MAX_DATE_OF_BIRTH}
              onChange={(patch) => {
                if (patch.passportNo !== undefined) setPassportNo(patch.passportNo);
                if (patch.nationality !== undefined) setNationality(patch.nationality);
                if (patch.dateOfBirth !== undefined) setDateOfBirth(patch.dateOfBirth);
              }}
            />

            <div className="pt-4 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg bg-primary text-white font-semibold hover:bg-[#e71520] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Completing onboarding...
                  </>
                ) : (
                  <>
                    Complete Profile
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-2.5 px-4 rounded-lg border border-[#e5e2e1] text-[#5e3f3c] font-semibold hover:bg-[#f6f3f2] transition-all cursor-pointer text-sm"
              >
                Sign Out
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#fcf9f8]">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OnboardingForm />
    </Suspense>
  );
}
