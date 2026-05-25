'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerAction } from '../../actions/auth-actions';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'PASSENGER' | 'STAFF' | 'ADMIN'>('PASSENGER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await registerAction(email, password, name, role);
      if (res.success) {
        setSuccess(res.message || 'Registration successful!');
        setEmail('');
        setPassword('');
        setName('');
        // Wait 3 seconds and redirect to login
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(res.error || 'Registration failed.');
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
            Join the Club.
          </h2>
          <p className="text-white/80 text-lg max-w-md">
            Unlock exclusive fares, early access to deals, and earn miles on every journey.
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
              Create an account
            </h2>
            <p className="text-[#5e3f3c]">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-primary hover:text-[#e71520] transition-colors">
                Sign in
              </Link>
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
              <label htmlFor="name" className="block text-sm font-medium text-[#1A1A1A] mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-primary/60">person</span>
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-[#1A1A1A] bg-[#fcf9f8]"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1A1A1A] mb-1">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-primary/60">mail</span>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-[#1A1A1A] bg-[#fcf9f8]"
                  placeholder="john.doe@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1A1A1A] mb-1">
                Password (minimum 8 characters)
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-[#1A1A1A] bg-[#fcf9f8]"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-[#1A1A1A] mb-1">
                Select Account Role
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <span className="material-symbols-outlined text-primary/60">admin_panel_settings</span>
                </div>
                <select
                  id="role"
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-[#1A1A1A] bg-[#fcf9f8] appearance-none"
                >
                  <option value="PASSENGER">Passenger</option>
                  <option value="STAFF">Airline Staff</option>
                  <option value="ADMIN">Administrator</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="material-symbols-outlined text-[#1A1A1A]/60">expand_more</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg bg-primary text-white font-semibold hover:bg-[#e71520] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Register Account
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
