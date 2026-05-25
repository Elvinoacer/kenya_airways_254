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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg border border-slate-100 text-center">
        <div>
          <div className="flex justify-center">
            <span className="text-2xl font-black tracking-wider text-[#002b5c]">
              KENYA <span className="text-[#c8102e]">AIRWAYS</span>
            </span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-[#002b5c]">
            Email Verification
          </h2>
        </div>

        {verifying && (
          <div className="flex flex-col items-center justify-center space-y-4 py-8">
            <div className="w-10 h-10 border-4 border-[#002b5c] border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 font-medium">Verifying your email address...</p>
          </div>
        )}

        {!verifying && error && (
          <div className="space-y-6 py-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-700 font-semibold text-lg">{error}</p>
            <p className="text-sm text-slate-500">
              The link may have expired or is invalid. Please try requesting a new registration or password reset.
            </p>
            <div className="pt-4">
              <Link href="/register" className="py-2.5 px-6 rounded-lg bg-[#002b5c] text-white font-semibold hover:bg-[#001f44] transition-all inline-block">
                Back to Registration
              </Link>
            </div>
          </div>
        )}

        {!verifying && success && (
          <div className="space-y-6 py-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-emerald-700 font-semibold text-lg">{success}</p>
            <p className="text-sm text-slate-500">
              Your email has been verified. Redirecting you to the sign in page...
            </p>
            <div className="pt-4">
              <Link href="/login" className="py-2.5 px-6 rounded-lg bg-[#002b5c] text-white font-semibold hover:bg-[#001f44] transition-all inline-block">
                Sign In Now
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-[#002b5c] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}
