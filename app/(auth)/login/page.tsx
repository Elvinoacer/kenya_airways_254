'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loginAction, verify2FALoginAction } from '../../actions/auth-actions';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // 2FA state
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (twoFactorRequired) {
        const res = await verify2FALoginAction(email, mfaCode, rememberMe);
        if (res.success) {
          setSuccess('Log in successful! Redirecting...');
          setTimeout(() => {
            router.push('/dashboard');
            router.refresh();
          }, 1500);
        } else {
          setError(res.error || '2FA Verification failed.');
        }
      } else {
        const res = await loginAction(email, password, rememberMe);
        if (res.success) {
          if (res.twoFactorRequired) {
            setTwoFactorRequired(true);
            setSuccess('2FA code sent! Please check your email (or terminal console).');
          } else {
            setSuccess('Log in successful! Redirecting...');
            setTimeout(() => {
              router.push('/dashboard');
              router.refresh();
            }, 1500);
          }
        } else {
          setError(res.error || 'Login failed.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Mock social logins for demo/testing
  const handleMockSocialLogin = async (provider: 'Google' | 'Apple') => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    // We use a mock email depending on provider
    const mockEmail = provider === 'Google' ? 'google.passenger@gmail.com' : 'apple.passenger@icloud.com';
    const mockName = provider === 'Google' ? 'Google Passenger' : 'Apple Passenger';

    try {
      // Direct mock session injection (in real life, this would route to OAuth client)
      // For this skeleton, we will register the user if they don't exist and log them in
      const res = await loginAction(mockEmail, 'MockPass1234!', true);
      if (res.success) {
        setSuccess(`Logged in via ${provider}! Redirecting...`);
        setTimeout(() => {
          router.push('/dashboard');
          router.refresh();
        }, 1500);
      } else {
        // If not registered yet, we register and try login
        const regRes = await registerAction(mockEmail, 'MockPass1234!', mockName, 'PASSENGER');
        if (regRes.success) {
          const loginRes = await loginAction(mockEmail, 'MockPass1234!', true);
          if (loginRes.success) {
            setSuccess(`Registered and Logged in via ${provider}! Redirecting...`);
            setTimeout(() => {
              router.push('/dashboard');
              router.refresh();
            }, 1500);
            return;
          }
        }
        setError(`Failed to sign in with ${provider}: ${regRes.error || 'Internal error'}`);
      }
    } catch (err: any) {
      setError(err.message || 'OAuth mock login failed.');
    } finally {
      setLoading(false);
    }
  };

  // Import registerAction so mock social login can use it
  const registerAction = require('../../actions/auth-actions').registerAction;

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
            {twoFactorRequired ? 'Enter 2FA Code' : 'Sign in to your account'}
          </h2>
          {!twoFactorRequired && (
            <p className="mt-2 text-center text-sm text-slate-500">
              Or{' '}
              <Link href="/register" className="font-semibold text-[#c8102e] hover:text-[#a00c24] transition-colors">
                create a new account
              </Link>
            </p>
          )}
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
          {twoFactorRequired ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 text-center">
                A 6-digit verification code has been generated. For testing purposes, please check your server terminal console logs to find the code.
              </p>
              <div>
                <label htmlFor="mfaCode" className="block text-sm font-medium text-slate-700 mb-1">
                  6-Digit Verification Code
                </label>
                <input
                  id="mfaCode"
                  name="mfaCode"
                  type="text"
                  required
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2.5 text-center text-2xl tracking-widest font-bold rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002b5c] transition-all text-slate-900"
                  placeholder="000000"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
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
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-xs font-semibold text-[#c8102e] hover:text-[#a00c24] transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002b5c] transition-all text-slate-900"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-[#002b5c] focus:ring-[#002b5c] border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 cursor-pointer select-none">
                  Remember me (30 days session)
                </label>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg bg-[#002b5c] text-white font-semibold hover:bg-[#001f44] focus:ring-4 focus:ring-blue-100 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-400"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : twoFactorRequired ? (
                'Verify & Login'
              ) : (
                'Sign In'
              )}
            </button>
          </div>

          {!twoFactorRequired && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-500 font-medium">Or continue with</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleMockSocialLogin('Google')}
                  className="w-full inline-flex justify-center py-2.5 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.137 4.114-3.327 0-6.023-2.696-6.023-6.023 0-3.327 2.696-6.023 6.023-6.023 1.455 0 2.784.522 3.821 1.385l3.14-3.14A11.968 11.968 0 0 0 12.24 0C5.642 0 0 5.642 0 12.24s5.642 12.24 12.24 12.24c6.702 0 11.233-4.71 11.233-11.442 0-.771-.067-1.52-.2-2.253H12.24Z"/>
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => handleMockSocialLogin('Apple')}
                  className="w-full inline-flex justify-center py-2.5 px-4 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#000000" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.2.67-2.92 1.51-.62.73-1.16 1.87-1.01 2.98 1.1.09 2.24-.57 2.94-1.43Z"/>
                  </svg>
                  Apple
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
