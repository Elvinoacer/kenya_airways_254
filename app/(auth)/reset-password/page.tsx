'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { resetPasswordAction } from '../../actions/auth-actions';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const t = searchParams.get('token');
    if (t) {
      setToken(t);
    } else {
      setError('Invalid reset link: Missing token.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Token is missing. Cannot reset password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await resetPasswordAction(token, password);
      if (res.success) {
        setSuccess(res.message || 'Password reset successfully!');
        setPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(res.error || 'Failed to reset password.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
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
          <Link href="/" className="inline-block mb-8">
            <span className="text-3xl font-black tracking-wider text-white">
              KENYA <span className="text-primary">AIRWAYS</span>
            </span>
          </Link>
          <h2 className="text-4xl font-semibold mb-4 leading-tight">
            Account Recovery
          </h2>
          <p className="text-white/80 text-lg max-w-md">
            We will help you get back on board securely.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-16">
        <div className="w-full max-w-md space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-[0_12px_32px_rgba(13,13,13,0.08)] border border-[#e5e2e1]">
          <div>
            <div className="flex justify-center lg:hidden mb-8">
              <Link href="/">
                <span className="text-2xl font-black tracking-wider text-[#1A1A1A]">
                  KENYA <span className="text-primary">AIRWAYS</span>
                </span>
              </Link>
            </div>
            <h2 className="text-3xl font-bold text-[#1A1A1A] mb-2">
              Enter new password
            </h2>
            <p className="text-[#5e3f3c]">
              Please enter your new secure password below.
            </p>
          </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg">
            <p className="text-sm text-emerald-700 font-medium">{success}</p>
          </div>
        )}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1A1A1A] mb-1">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-primary/60">lock</span>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={!token}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-[#1A1A1A] bg-[#fcf9f8] disabled:opacity-50"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#1A1A1A] mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-primary/60">lock</span>
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  disabled={!token}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-[#1A1A1A] bg-[#fcf9f8] disabled:opacity-50"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !token}
              className="w-full py-3 px-4 rounded-lg bg-primary text-white font-semibold hover:bg-[#e71520] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Updating password...
                </>
              ) : (
                <>
                  Update Password
                  <span className="material-symbols-outlined text-[18px]">key</span>
                </>
              )}
            </button>
          </div>

          <div className="text-center mt-6">
            <Link href="/login" className="font-semibold text-sm text-primary hover:text-[#e71520] transition-colors inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Return to Sign In
            </Link>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#fcf9f8]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
