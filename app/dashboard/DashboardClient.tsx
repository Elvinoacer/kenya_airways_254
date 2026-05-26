"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  logoutAction,
  logoutAllDevicesAction,
  updateProfileSettingsAction,
  toggle2FAAction,
  changePasswordAction,
  revokeActiveSessionAction,
} from "../actions/auth-actions";

interface DashboardClientProps {
  initialData: {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: "PASSENGER" | "STAFF" | "ADMIN";
      twoFactorEnabled: boolean;
      avatarUrl: string | null;
    };
    passenger?: {
      id: string;
      firstName: string;
      lastName: string;
      phone: string | null;
      passportNumber: string | null;
      nationality: string | null;
      dateOfBirth: string | null;
      frequentFlyerNo?: string | null;
      createdAt: string;
      updatedAt: string;
    };
    activeSessions: Array<{
      id: string;
      ipAddress: string | null;
      userAgent: string | null;
      createdAt: string;
      isCurrent: boolean;
    }>;
  };
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const router = useRouter();
  const { user, passenger, activeSessions } = initialData;

  const [activeTab, setActiveTab] = useState<"overview" | "profile" | "security">("overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form states
  const [name, setName] = useState(user.name || "");
  const [avatar, setAvatar] = useState(user.avatarUrl || "");

  // Passenger form states
  const [firstName, setFirstName] = useState(passenger?.firstName || "");
  const [lastName, setLastName] = useState(passenger?.lastName || "");
  const [phone, setPhone] = useState(passenger?.phone || "");
  const [passportNo, setPassportNo] = useState(passenger?.passportNumber || "");
  const [nationality, setNationality] = useState(passenger?.nationality || "");
  const [dateOfBirth, setDateOfBirth] = useState(passenger?.dateOfBirth || "");

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user.twoFactorEnabled);

  // Clear messages helper
  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "N/A";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  };

  const handleLogout = async () => {
    setLoading(true);
    await logoutAction();
    router.push("/login");
    router.refresh();
  };

  const handleLogoutAllDevices = async () => {
    if (confirm("Are you sure you want to sign out from all devices?")) {
      setLoading(true);
      await logoutAllDevicesAction();
      router.push("/login");
      router.refresh();
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      const res = await updateProfileSettingsAction(
        name,
        firstName,
        lastName,
        phone,
        passportNo,
        nationality,
        dateOfBirth,
        avatar,
      );

      if (res.success) {
        setSuccess(res.message || "Profile updated successfully.");
        router.refresh();
      } else {
        setError(res.error || "Failed to update profile.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle2FA = async () => {
    setLoading(true);
    clearMessages();
    const nextState = !twoFactorEnabled;

    try {
      const res = await toggle2FAAction(nextState);
      if (res.success) {
        setTwoFactorEnabled(nextState);
        setSuccess(res.message || "2FA settings updated.");
        router.refresh();
      } else {
        setError(res.error || "Failed to toggle 2FA.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    clearMessages();

    try {
      const res = await changePasswordAction(currentPassword, newPassword);
      if (res.success) {
        setSuccess(res.message || "Password updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(res.error || "Failed to update password.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setLoading(true);
    clearMessages();

    try {
      const res = await revokeActiveSessionAction(sessionId);
      if (res.success) {
        setSuccess(res.message || "Session terminated.");
        router.refresh();
      } else {
        setError(res.error || "Failed to terminate session.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Mock Avatar selector
  const selectMockAvatar = (emoji: string) => {
    setAvatar(emoji);
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8] text-[#1A1A1A]">
      {/* Navbar */}
      <header className="bg-white border-b border-[#e5e2e1] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-wider text-[#1A1A1A]">
              KENYA <span className="text-[#c8102e]">AIRWAYS</span>
            </span>
            <span className="bg-[#f6f3f2] text-xs text-[#5e3f3c] font-semibold px-2 py-0.5 rounded-full uppercase">
              {user.role}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-lg font-bold border border-[#e5e2e1]">
                {avatar || user.name?.[0] || user.email[0].toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-[#1A1A1A] hidden sm:inline-block">
                {user.name || user.email}
              </span>
            </div>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="text-sm font-semibold text-[#5e3f3c] hover:text-[#c8102e] transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Navigation Sidebar */}
          <div className="md:col-span-1 space-y-2">
            <button
              onClick={() => {
                setActiveTab("overview");
                clearMessages();
              }}
              className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all flex items-center gap-3 cursor-pointer ${
                activeTab === "overview"
                  ? "bg-primary text-white shadow-md"
                  : "bg-white text-[#5e3f3c] hover:bg-[#f6f3f2] border border-[#e5e2e1]"
              }`}
            >
              Overview
            </button>

            {user.role === "PASSENGER" && (
              <button
                onClick={() => {
                  setActiveTab("profile");
                  clearMessages();
                }}
                className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all flex items-center gap-3 cursor-pointer ${
                  activeTab === "profile"
                    ? "bg-primary text-white shadow-md"
                    : "bg-white text-[#5e3f3c] hover:bg-[#f6f3f2] border border-[#e5e2e1]"
                }`}
              >
                Passenger Profile
              </button>
            )}

            <button
              onClick={() => {
                setActiveTab("security");
                clearMessages();
              }}
              className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all flex items-center gap-3 cursor-pointer ${
                activeTab === "security"
                  ? "bg-primary text-white shadow-md"
                  : "bg-white text-[#5e3f3c] hover:bg-[#f6f3f2] border border-[#e5e2e1]"
              }`}
            >
              Security & Sessions
            </button>

            <hr className="border-[#e5e2e1] my-4" />

            <button
              onClick={handleLogoutAllDevices}
              disabled={loading}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold text-[#c8102e] hover:bg-red-50 transition-all flex items-center gap-3 cursor-pointer border border-transparent hover:border-red-100"
            >
              Logout From All Devices
            </button>
          </div>

          {/* Details Area */}
          <div className="md:col-span-3 space-y-6">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg shadow-sm">
                <p className="text-sm text-emerald-700 font-medium">{success}</p>
              </div>
            )}

            {/* TAB: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-[#e5e2e1] space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#1A1A1A]">Welcome back, {user.name || "Traveler"}!</h2>
                  <p className="text-[#5e3f3c] text-sm">Review your flight portal credentials and basic settings.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center p-6 bg-[#fcf9f8] rounded-xl border border-[#e5e2e1]">
                  <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-3xl font-bold">
                    {avatar || user.name?.[0] || user.email[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-[#1A1A1A]">{user.name || "Not set"}</h3>
                    <p className="text-[#5e3f3c] text-sm">{user.email}</p>
                  </div>
                </div>

                {passenger ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[
                      ["Passenger ID", passenger.id],
                      ["Passport Number", passenger.passportNumber || "N/A"],
                      ["Nationality", passenger.nationality || "N/A"],
                      ["Phone", passenger.phone || "N/A"],
                      ["Date of Birth", formatDate(passenger.dateOfBirth)],
                      ["Frequent Flyer No.", passenger.frequentFlyerNo || "N/A"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-[#e5e2e1] bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#5e3f3c]">{label}</p>
                        <p className="mt-1 text-sm font-bold text-[#1A1A1A] break-words">{value}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[#e5e2e1] bg-[#fcf9f8] p-4 text-sm text-[#5e3f3c]">
                    No passenger profile has been saved yet. Complete onboarding to store your travel details.
                  </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <h3 className="text-lg font-bold text-[#1A1A1A]">Edit Display Profile</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name-input" className="block text-sm font-medium text-[#5e3f3c] mb-1">
                        Display Name
                      </label>
                      <input
                        type="text"
                        id="name-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A]"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <span className="block text-sm font-medium text-[#5e3f3c] mb-2">Select Avatar Emoji</span>
                      <div className="flex gap-2">
                        {["✈️", "🌍", "🦁", "🐆", "🐘", "🌅"].map((emoji) => (
                          <button
                            type="button"
                            key={emoji}
                            onClick={() => selectMockAvatar(emoji)}
                            className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center border transition-all cursor-pointer ${
                              avatar === emoji
                                ? "border-primary bg-primary/10 scale-110 shadow-sm"
                                : "border-[#e5e2e1] bg-white hover:bg-[#fcf9f8]"
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-[#e71520] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save General Settings
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB: PASSENGER PROFILE */}
            {activeTab === "profile" && user.role === "PASSENGER" && (
              <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-[#e5e2e1] space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#1A1A1A]">Passenger flight Profile</h2>
                  <p className="text-[#5e3f3c] text-sm">
                    International travel document registry for secure booking validation.
                  </p>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="fn-input" className="block text-sm font-medium text-[#5e3f3c] mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        id="fn-input"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A]"
                      />
                    </div>

                    <div>
                      <label htmlFor="ln-input" className="block text-sm font-medium text-[#5e3f3c] mb-1">
                        Last / Family Name
                      </label>
                      <input
                        type="text"
                        id="ln-input"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A]"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone-input" className="block text-sm font-medium text-[#5e3f3c] mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone-input"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A]"
                      />
                    </div>

                    <div>
                      <label htmlFor="pass-input" className="block text-sm font-medium text-[#5e3f3c] mb-1">
                        Passport Number
                      </label>
                      <input
                        type="text"
                        id="pass-input"
                        required
                        value={passportNo}
                        onChange={(e) => setPassportNo(e.target.value.toUpperCase())}
                        className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A]"
                      />
                    </div>

                    <div>
                      <label htmlFor="nat-input" className="block text-sm font-medium text-[#5e3f3c] mb-1">
                        Nationality
                      </label>
                      <input
                        type="text"
                        id="nat-input"
                        required
                        value={nationality}
                        onChange={(e) => setNationality(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A]"
                      />
                    </div>

                    <div>
                      <label htmlFor="dob-input" className="block text-sm font-medium text-[#5e3f3c] mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        id="dob-input"
                        required
                        max={
                          new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]
                        }
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A]"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-[#e71520] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Update Flight Documents
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB: SECURITY & SESSIONS */}
            {activeTab === "security" && (
              <div className="space-y-6">
                {/* 2FA Panel */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-[#e5e2e1] space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-[#1A1A1A]">Two-Factor Authentication (2FA)</h3>
                    <p className="text-[#5e3f3c] text-sm">
                      Add an extra layer of protection to your passenger profile. A login token will be generated upon
                      login verification.
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#fcf9f8] rounded-xl border border-[#e5e2e1]">
                    <div className="flex flex-col">
                      <span className="font-semibold text-[#1A1A1A]">
                        {twoFactorEnabled ? "2FA is Enabled" : "2FA is Disabled"}
                      </span>
                      <span className="text-xs text-[#5e3f3c]">
                        {twoFactorEnabled
                          ? "Your account is extra secure."
                          : "Turn on to require code upon credentials check."}
                      </span>
                    </div>

                    <button
                      onClick={handleToggle2FA}
                      disabled={loading}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
                        twoFactorEnabled
                          ? "bg-red-50 text-[#c8102e] hover:bg-red-100 border border-red-200"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                      }`}
                    >
                      {twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                    </button>
                  </div>
                </div>

                {/* Password panel */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-[#e5e2e1] space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-[#1A1A1A]">Change Security Password</h3>
                    <p className="text-[#5e3f3c] text-sm">Ensure your booking login is strong and complex.</p>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="old-pass" className="block text-sm font-medium text-[#5e3f3c] mb-1">
                          Current Password
                        </label>
                        <input
                          type="password"
                          id="old-pass"
                          required
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A]"
                          placeholder="••••••••"
                        />
                      </div>

                      <div>
                        <label htmlFor="new-pass" className="block text-sm font-medium text-[#5e3f3c] mb-1">
                          New Password
                        </label>
                        <input
                          type="password"
                          id="new-pass"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A]"
                          placeholder="••••••••"
                        />
                      </div>

                      <div>
                        <label htmlFor="conf-new-pass" className="block text-sm font-medium text-[#5e3f3c] mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          id="conf-new-pass"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-[#e5e2e1] focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[#1A1A1A]"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-[#e71520] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Change Password
                      </button>
                    </div>
                  </form>
                </div>

                {/* Device Sessions Panel */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-[#e5e2e1] space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-[#1A1A1A]">Active Device Sessions</h3>
                    <p className="text-[#5e3f3c] text-sm">Monitor and terminate other active web portal logins.</p>
                  </div>

                  <div className="space-y-4">
                    {activeSessions.map((session) => (
                      <div
                        key={session.id}
                        className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border transition-all ${
                          session.isCurrent ? "bg-primary/10 border-primary/20" : "bg-[#fcf9f8] border-[#e5e2e1]"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#1A1A1A] text-sm sm:text-base">
                              IP: {session.ipAddress || "unknown"}
                            </span>
                            {session.isCurrent && (
                              <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#5e3f3c] truncate max-w-md">{session.userAgent || "unknown"}</p>
                          <p className="text-[10px] text-[#5e3f3c]">
                            Logged in: {new Date(session.createdAt).toLocaleString()}
                          </p>
                        </div>

                        {!session.isCurrent && (
                          <button
                            onClick={() => handleRevokeSession(session.id)}
                            disabled={loading}
                            className="mt-3 sm:mt-0 px-3 py-1.5 rounded-lg border border-red-200 bg-white text-xs font-semibold text-[#c8102e] hover:bg-red-50 transition-all cursor-pointer"
                          >
                            Revoke Device
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
