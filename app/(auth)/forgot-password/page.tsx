'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { forgotPasswordAction } from '../../actions/auth-actions';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await forgotPasswordAction(email);
      if (res.success) {
        setSuccess(res.message || 'Password reset link sent!');
        setEmail('');
      } else {
        setError(res.error || 'Failed to request password reset.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
        <div>
          <div className="flex justify-center">
            <span className="text-2xl font-black tracking-wider text-[#002b5c]">
              KENYA <span className="text-[#c8102e]">AIRWAYS</span>
            </span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[#002b5c]">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            Enter your email address and we will send you a secure link to reset your password.
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

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002b5c] transition-all text-slate-900"
              placeholder="john.doe@example.com"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg bg-[#002b5c] text-white font-semibold hover:bg-[#001f44] focus:ring-4 focus:ring-blue-100 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-400"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending link...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </div>

          <div className="text-center">
            <Link href="/login" className="font-semibold text-sm text-[#c8102e] hover:text-[#a00c24] transition-colors">
              Back to Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
