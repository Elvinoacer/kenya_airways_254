"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  loginAction,
  resendVerificationAction,
  verify2FALoginAction,
} from "../../actions/auth-actions";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl");
  const callbackUrl =
    rawCallbackUrl?.startsWith("/") && !rawCallbackUrl.startsWith("//")
      ? rawCallbackUrl
      : "/dashboard";
  const registerHref = `/register?${new URLSearchParams({
    callbackUrl,
  }).toString()}`;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // 2FA state
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendingVerification, setResendingVerification] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    setVerificationEmail("");

    try {
      if (twoFactorRequired) {
        const res = await verify2FALoginAction(email, mfaCode, rememberMe);
        if (res.success) {
          setSuccess("Log in successful! Redirecting...");
          setTimeout(() => {
            router.push(callbackUrl);
            router.refresh();
          }, 1500);
        } else {
          setError(res.error || "2FA Verification failed.");
        }
      } else {
        const res = await loginAction(email, password, rememberMe);
        if (res.success) {
          if (res.twoFactorRequired) {
            setTwoFactorRequired(true);
            setSuccess(
              "2FA code sent! Please check your email (or terminal console).",
            );
          } else {
            setSuccess("Log in successful! Redirecting...");
            setTimeout(() => {
              router.push(callbackUrl);
              router.refresh();
            }, 1500);
          }
        } else {
          setError(res.error || "Login failed.");
          if (
            res.error &&
            /verify your email address|verification link|email verification/i.test(
              res.error,
            )
          ) {
            setVerificationEmail(email);
          }
        }
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const targetEmail = (verificationEmail || email).trim();
    if (!targetEmail) {
      setError("Enter your email address first.");
      return;
    }

    setResendingVerification(true);
    setError("");
    setSuccess("");

    try {
      const res = await resendVerificationAction(targetEmail, callbackUrl);
      if (res.success) {
        setSuccess(res.message || "A new verification link has been sent.");
        setVerificationEmail(targetEmail);
      } else {
        setError(res.error || "Could not resend the verification email.");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not resend the verification email.",
      );
    } finally {
      setResendingVerification(false);
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
            The Pride
            <br />
            of Africa.
          </h2>
          <p className="text-white/80 text-lg max-w-md">
            Connect to the world with award-winning hospitality and world-class
            service.
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
              {twoFactorRequired ? "Enter 2FA Code" : "Sign in"}
            </h2>
            {!twoFactorRequired && (
              <p className="text-[#5e3f3c]">
                New to Kenya Airways?{" "}
                <Link
                  href={registerHref}
                  className="font-semibold text-primary hover:text-[#e71520] transition-colors"
                >
                  Create an account
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

          {verificationEmail && !twoFactorRequired && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg space-y-3">
              <p className="text-sm text-amber-800 font-medium">
                Your account still needs email verification.
              </p>
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendingVerification}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500 bg-white px-4 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resendingVerification
                  ? "Sending..."
                  : "Resend verification link"}
                {!resendingVerification && (
                  <span className="material-symbols-outlined text-[18px]">
                    mark_email_unread
                  </span>
                )}
              </button>
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {twoFactorRequired ? (
              <div className="space-y-4">
                <p className="text-sm text-[#5e3f3c]">
                  A 6-digit verification code has been sent to your email
                  address. Enter it here to continue.
                </p>
                <div>
                  <label
                    htmlFor="mfaCode"
                    className="block text-sm font-medium text-[#1A1A1A] mb-1"
                  >
                    6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-primary/60">
                        pin
                      </span>
                    </div>
                    <input
                      id="mfaCode"
                      name="mfaCode"
                      type="text"
                      required
                      maxLength={6}
                      value={mfaCode}
                      onChange={(e) =>
                        setMfaCode(e.target.value.replace(/\D/g, ""))
                      }
                      className="w-full pl-10 pr-4 py-3 text-center text-2xl tracking-widest font-bold rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-[#1A1A1A] bg-[#fcf9f8]"
                      placeholder="000000"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-[#1A1A1A] mb-1"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-primary/60">
                        mail
                      </span>
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
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-[#1A1A1A]"
                    >
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-sm font-semibold text-primary hover:text-[#e71520] transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="material-symbols-outlined text-primary/60">
                        lock
                      </span>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all text-[#1A1A1A] bg-[#fcf9f8]"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-primary focus:ring-primary border-[#e5e2e1] rounded cursor-pointer"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-[#5e3f3c] cursor-pointer select-none"
                  >
                    Remember me for 30 days
                  </label>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg bg-primary text-white font-semibold hover:bg-[#e71520] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : twoFactorRequired ? (
                  <>
                    Verify & Login
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </>
                ) : (
                  <>
                    Sign In
                    <span className="material-symbols-outlined text-[18px]">
                      login
                    </span>
                  </>
                )}
              </button>
            </div>

            {!twoFactorRequired && (
              <p className="pt-2 text-center text-xs leading-5 text-[#5e3f3c]">
                Email verification is required before access to passenger,
                staff, or admin pages.
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#fcf9f8]">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
