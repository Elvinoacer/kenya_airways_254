'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { onboardPassengerAction, logoutAction } from '../actions/auth-actions';

export default function OnboardingPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [passportNo, setPassportNo] = useState('');
  const [nationality, setNationality] = useState('Kenya');
  const [dateOfBirth, setDateOfBirth] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await onboardPassengerAction(
        firstName,
        lastName,
        phone,
        passportNo,
        nationality,
        dateOfBirth
      );

      if (res.success) {
        setSuccess(res.message || 'Profile onboarding complete!');
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 1500);
      } else {
        setError(res.error || 'Onboarding failed.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logoutAction();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="flex justify-center">
          <span className="text-2xl font-black tracking-wider text-[#002b5c]">
            KENYA <span className="text-[#c8102e]">AIRWAYS</span>
          </span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-[#002b5c]">
          Complete Your Passenger Profile
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          To comply with international flight security, please enter your details.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-4 shadow-lg rounded-2xl sm:px-10 border border-slate-100">
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
                <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002b5c] transition-all text-slate-900"
                  placeholder="John"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 mb-1">
                  Last / Family Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002b5c] transition-all text-slate-900"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
                Phone Number (optional)
              </label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002b5c] transition-all text-slate-900"
                placeholder="+254 700 000000"
              />
            </div>

            <div>
              <label htmlFor="passportNo" className="block text-sm font-medium text-slate-700 mb-1">
                Passport Number
              </label>
              <input
                type="text"
                id="passportNo"
                required
                value={passportNo}
                onChange={(e) => setPassportNo(e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002b5c] transition-all text-slate-900"
                placeholder="AK0000000"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="nationality" className="block text-sm font-medium text-slate-700 mb-1">
                  Nationality
                </label>
                <input
                  type="text"
                  id="nationality"
                  required
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002b5c] transition-all text-slate-900"
                  placeholder="Kenya"
                />
              </div>

              <div>
                <label htmlFor="dob" className="block text-sm font-medium text-slate-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  id="dob"
                  required
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002b5c] transition-all text-slate-900"
                />
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg bg-[#002b5c] text-white font-semibold hover:bg-[#001f44] focus:ring-4 focus:ring-blue-100 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-400"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Completing onboarding...
                  </>
                ) : (
                  'Complete Profile'
                )}
              </button>
              
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-2.5 px-4 rounded-lg border border-slate-200 text-slate-500 font-semibold hover:bg-slate-50 transition-all cursor-pointer text-sm"
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
