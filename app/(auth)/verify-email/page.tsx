'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { verifyEmailAction } from '../../actions/auth-actions';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const runRef = useRef(false);

  useEffect(() => {
    // Avoid double-execution in React StrictMode
    if (runRef.current) return;
    runRef.current = true;

    const token = searchParams.get('token');
    if (!token) {
      setError('Invalid email verification link: Missing token.');
      setVerifying(false);
      return;
    }

    const runVerify = async () => {
      try {
        const res = await verifyEmailAction(token);
        if (res.success) {
          setSuccess(res.message || 'Email verified successfully!');
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/login');
          }, 3000);
        } else {
          setError(res.error || 'Email verification failed.');
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setVerifying(false);
      }
    };

    runVerify();
  }, [searchParams, router]);

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
            Account Verification
          </h2>
          <p className="text-white/80 text-lg max-w-md">
            Securing your account for a safe journey ahead.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-16">
        <div className="w-full max-w-md space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-[0_12px_32px_rgba(13,13,13,0.08)] border border-[#e5e2e1] text-center">
          <div>
            <div className="flex justify-center lg:hidden mb-8">
              <Link href="/">
                <span className="text-2xl font-black tracking-wider text-[#1A1A1A]">
                  KENYA <span className="text-primary">AIRWAYS</span>
                </span>
              </Link>
            </div>
            <h2 className="text-3xl font-bold text-[#1A1A1A] mb-2">
              Email Verification
            </h2>
          </div>

        {verifying && (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-[#5e3f3c] font-medium">Verifying your email address...</p>
          </div>
        )}

        {!verifying && error && (
          <div className="space-y-6 py-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 text-red-600 mb-4 border border-red-100">
              <span className="material-symbols-outlined text-4xl">error</span>
            </div>
            <p className="text-[#1A1A1A] font-bold text-xl">{error}</p>
            <p className="text-sm text-[#5e3f3c]">
              The link may have expired or is invalid. Please try requesting a new registration or password reset.
            </p>
            <div className="pt-4">
              <Link href="/register" className="w-full py-3 px-4 rounded-lg bg-primary text-white font-semibold hover:bg-[#e71520] transition-all inline-flex items-center justify-center gap-2 shadow-sm">
                Back to Registration
                <span className="material-symbols-outlined text-[18px]">person_add</span>
              </Link>
            </div>
          </div>
        )}

        {!verifying && success && (
          <div className="space-y-6 py-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mb-4 border border-emerald-100">
              <span className="material-symbols-outlined text-4xl">check_circle</span>
            </div>
            <p className="text-[#1A1A1A] font-bold text-xl">{success}</p>
            <p className="text-sm text-[#5e3f3c]">
              Your email has been verified. Redirecting you to the sign in page...
            </p>
            <div className="pt-4">
              <Link href="/login" className="w-full py-3 px-4 rounded-lg bg-primary text-white font-semibold hover:bg-[#e71520] transition-all inline-flex items-center justify-center gap-2 shadow-sm">
                Sign In Now
                <span className="material-symbols-outlined text-[18px]">login</span>
              </Link>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#fcf9f8]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}
