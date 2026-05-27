"use server";

import { cookies } from "next/headers";
import { prisma } from "../../lib/prisma";
import {
  hashPassword,
  verifyPassword,
  createDbSession,
  revokeSession,
  revokeAllUserSessions,
  recordLoginAttempt,
  isLoginThrottled,
  handleFailedLogin,
  resetFailedLoginAttempts,
  checkSuspiciousLogin,
  createVerificationToken,
  verifyEmailToken,
  verifyPasswordResetToken,
  verifySessionCookie,
  generateSessionCookie,
  isSessionActiveInDb,
  SessionPayload,
} from "../../lib/auth-session";
import { sendEmail } from "../../lib/notifications";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  "http://localhost:3000";

function isAtLeast18(dateOfBirthStr: string) {
  if (!dateOfBirthStr) return false;

  const dateOfBirth = new Date(dateOfBirthStr);
  if (Number.isNaN(dateOfBirth.getTime())) return false;

  const today = new Date();
  const eighteenthBirthday = new Date(dateOfBirth);
  eighteenthBirthday.setFullYear(eighteenthBirthday.getFullYear() + 18);

  return eighteenthBirthday <= today;
}

// Helper to get active session from cookies
async function getActiveSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const cookieVal = cookieStore.get("kq_session")?.value;
  const payload = await verifySessionCookie(cookieVal);
  if (!payload) return null;
  try {
    const active = await isSessionActiveInDb(payload.sessionId);
    return active ? payload : null;
  } catch {
    return null;
  }
}

function authDatabaseErrorMessage(error: unknown) {
  const err = error as {
    code?: string;
    message?: string;
    cause?: { code?: string; message?: string };
  };
  const code = err.code || err.cause?.code || "";
  const message = `${err.message || ""} ${err.cause?.message || ""}`;
  if (
    [
      "ETIMEDOUT",
      "ECONNRESET",
      "ECONNREFUSED",
      "EHOSTUNREACH",
      "ENETUNREACH",
      "P1001",
      "P1002",
    ].includes(code) ||
    /timeout|timed out|can't reach database|connection/i.test(message)
  ) {
    return "The database connection is temporarily unavailable. Please try again in a moment.";
  }
  return null;
}

// ─────────────────────────────────────────
// 1. User Registration
// ─────────────────────────────────────────

export async function registerAction(
  email: string,
  password: string,
  name: string,
) {
  try {
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    const normalizedName = typeof name === "string" ? name.trim() : "";

    if (!normalizedEmail || !password || password.length < 8) {
      return {
        success: false,
        error:
          "Email is required and password must be at least 8 characters long.",
      };
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      return {
        success: false,
        error: "A user with this email address already exists.",
      };
    }

    const passwordHash = hashPassword(password);

    // Save user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: normalizedName || null,
        passwordHash,
        role: "PASSENGER",
        emailVerified: false,
        failedAttempts: 0,
      },
    });

    // Generate email verification token
    const { token } = await createVerificationToken(
      normalizedEmail,
      "EMAIL_VERIFICATION",
    );

    const verificationUrl = `${APP_URL}/verify-email?token=${token}`;
    const emailResult = await sendEmail(
      normalizedEmail,
      "Verify your Kenya Airways account",
      [
        `Hello ${normalizedName || "there"},`,
        "",
        "Welcome to Kenya Airways. Verify your email address to activate your passenger account:",
        verificationUrl,
        "",
        "If you did not request this, you can ignore this message.",
      ].join("\n"),
      {
        eyebrow: "Account verification",
        preheader:
          "Confirm your email address and finish setting up your Kenya Airways account.",
        cta: { label: "Verify email address", url: verificationUrl },
      },
    );

    if (!emailResult.ok) {
      return {
        success: false,
        error: `Registration succeeded, but verification email could not be sent: ${emailResult.error}`,
      };
    }

    return {
      success: true,
      message:
        "Registration successful! Please check your email for a verification link.",
    };
  } catch (err: any) {
    return {
      success: false,
      error:
        authDatabaseErrorMessage(err) ||
        err.message ||
        "An unexpected error occurred during registration.",
    };
  }
}

// ─────────────────────────────────────────
// 2. Login & 2FA
// ─────────────────────────────────────────

export async function loginAction(
  email: string,
  password: string,
  rememberMe: boolean,
  ipAddress: string | null = "127.0.0.1",
  userAgent: string | null = "unknown",
) {
  try {
    if (!email || !password) {
      return { success: false, error: "Email and password are required." };
    }

    const ip = ipAddress || "127.0.0.1";

    // Throttle login check
    if (await isLoginThrottled(email, ip)) {
      return {
        success: false,
        error: "Too many login attempts. Please try again in 5 minutes.",
      };
    }

    // Record login attempt
    await recordLoginAttempt(email, ip);

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { success: false, error: "Invalid email or password." };
    }

    // Check account lockout
    if (user.lockedUntil) {
      const lockExpiry = new Date(user.lockedUntil).getTime();
      if (lockExpiry > Date.now()) {
        const minutesLeft = Math.ceil((lockExpiry - Date.now()) / 60000);
        return {
          success: false,
          error: `Account is locked. Please try again in ${minutesLeft} minutes.`,
        };
      } else {
        // Lock expired, reset attempts
        await resetFailedLoginAttempts(user.id);
        user.lockedUntil = null;
        user.failedAttempts = 0;
      }
    }

    // Verify password
    const passwordMatch = verifyPassword(password, user.passwordHash);
    if (!passwordMatch) {
      // Re-fetch user details for updated lock parameters
      const { lockedUntil, remainingAttempts } = await handleFailedLogin(user);
      if (lockedUntil) {
        return {
          success: false,
          error:
            "Too many failed attempts. Your account has been locked for 15 minutes.",
        };
      }
      return {
        success: false,
        error: `Invalid email or password. ${remainingAttempts} attempts remaining before account lock.`,
      };
    }

    // Reset failed login attempts on successful credentials match
    await resetFailedLoginAttempts(user.id);

    if (!user.emailVerified) {
      return {
        success: false,
        error:
          "Please verify your email address before signing in. Check your inbox for the verification link.",
      };
    }

    // Check if 2FA (Two-Factor Authentication) is enabled
    if (user.twoFactorEnabled) {
      // Generate 2FA Verification Code
      const { code } = await createVerificationToken(
        email,
        "MFA_CODE",
        5 * 60 * 1000,
      ); // 5 mins expiry

      const emailResult = await sendEmail(
        email,
        "Your Kenya Airways verification code",
        [
          `Hello ${user.name || "there"},`,
          "",
          `Your verification code is: ${code}`,
          "",
          "This code expires in 5 minutes.",
          "If you did not try to sign in, please ignore this email.",
        ].join("\n"),
        {
          eyebrow: "Secure sign in",
          preheader:
            "Use this one-time code to complete your Kenya Airways sign in.",
          code,
        },
      );

      if (!emailResult.ok) {
        return {
          success: false,
          error: `2FA code could not be sent: ${emailResult.error}`,
        };
      }

      return {
        success: true,
        twoFactorRequired: true,
        email,
        rememberMe,
      };
    }

    // Check for suspicious login (IP or UA change)
    const isSuspicious = await checkSuspiciousLogin(user.id, ip, userAgent);
    if (isSuspicious) {
      console.log(
        `\n[SECURITY ALERT] Suspicious login detected for user ${email} from IP: ${ip}, UA: ${userAgent}\n`,
      );
    }

    // Create session
    const { expiresAt, cookieValue } = await createDbSession(
      user.id,
      user.role,
      ip,
      userAgent,
      rememberMe,
    );

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("kq_session", cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error:
        authDatabaseErrorMessage(err) ||
        err.message ||
        "An unexpected error occurred during login.",
    };
  }
}

export async function resendVerificationAction(email: string) {
  try {
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail) {
      return { success: false, error: "Email address is required." };
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { email: true, name: true, emailVerified: true },
    });

    if (!user || user.emailVerified) {
      return {
        success: true,
        message:
          "If an unverified account exists for that email address, a new verification link has been sent.",
      };
    }

    const { token } = await createVerificationToken(
      normalizedEmail,
      "EMAIL_VERIFICATION",
    );
    const verificationUrl = `${APP_URL}/verify-email?token=${token}`;

    const emailResult = await sendEmail(
      normalizedEmail,
      "Verify your Kenya Airways account",
      [
        `Hello ${user.name || "there"},`,
        "",
        "Your new Kenya Airways verification link is below:",
        verificationUrl,
        "",
        "If you did not request this, you can ignore this message.",
      ].join("\n"),
      {
        eyebrow: "Account verification",
        preheader:
          "Confirm your email address and finish setting up your Kenya Airways account.",
        cta: { label: "Verify email address", url: verificationUrl },
      },
    );

    if (!emailResult.ok) {
      return {
        success: false,
        error: `Verification email could not be sent: ${emailResult.error}`,
      };
    }

    return {
      success: true,
      message: "A new verification link has been sent to your email address.",
    };
  } catch (err: any) {
    return {
      success: false,
      error:
        authDatabaseErrorMessage(err) ||
        err.message ||
        "An unexpected error occurred while resending the verification email.",
    };
  }
}

export async function verify2FALoginAction(
  email: string,
  code: string,
  rememberMe: boolean,
  ipAddress: string | null = "127.0.0.1",
  userAgent: string | null = "unknown",
) {
  try {
    if (!email || !code) {
      return {
        success: false,
        error: "Email and verification code are required.",
      };
    }

    const row = await prisma.verificationToken.findUnique({
      where: { email_type: { email, type: "MFA_CODE" } },
    });

    if (!row || row.code !== code) {
      return { success: false, error: "Invalid 2FA code." };
    }

    if (row.expiresAt.getTime() < Date.now()) {
      await prisma.verificationToken.delete({ where: { id: row.id } });
      return {
        success: false,
        error: "2FA code has expired. Please log in again.",
      };
    }

    // Clean up code
    await prisma.verificationToken.delete({ where: { id: row.id } });

    // Fetch user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { success: false, error: "User not found." };
    }

    const ip = ipAddress || "127.0.0.1";

    // Check suspicious login
    await checkSuspiciousLogin(user.id, ip, userAgent);

    // Create session
    const { expiresAt, cookieValue } = await createDbSession(
      user.id,
      user.role,
      ip,
      userAgent,
      rememberMe,
    );

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("kq_session", cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error:
        authDatabaseErrorMessage(err) ||
        err.message ||
        "An error occurred during 2FA verification.",
    };
  }
}

// ─────────────────────────────────────────
// 3. Logout flows
// ─────────────────────────────────────────

export async function logoutAction() {
  const session = await getActiveSession();
  if (session) {
    await revokeSession(session.sessionId);
  }

  // Clear cookie
  const cookieStore = await cookies();
  cookieStore.delete("kq_session");

  return { success: true };
}

export async function logoutAllDevicesAction() {
  const session = await getActiveSession();
  if (session) {
    await revokeAllUserSessions(session.userId);
  }

  // Clear cookie
  const cookieStore = await cookies();
  cookieStore.delete("kq_session");

  return { success: true };
}

// ─────────────────────────────────────────
// 4. Forgot / Reset Password
// ─────────────────────────────────────────

export async function forgotPasswordAction(email: string) {
  try {
    if (!email) {
      return { success: false, error: "Email is required." };
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration attacks
    if (user) {
      const { token } = await createVerificationToken(
        email,
        "PASSWORD_RESET",
        30 * 60 * 1000,
      ); // 30 mins expiry

      const resetUrl = `${APP_URL}/reset-password?token=${token}`;
      const emailResult = await sendEmail(
        email,
        "Reset your Kenya Airways password",
        [
          "We received a request to reset your password.",
          "",
          "Reset your password here:",
          resetUrl,
          "",
          "If you did not request this, you can ignore this email.",
        ].join("\n"),
        {
          eyebrow: "Password reset",
          preheader: "Reset your Kenya Airways password securely.",
          cta: { label: "Reset password", url: resetUrl },
        },
      );

      if (!emailResult.ok) {
        return {
          success: false,
          error: `Password reset email could not be sent: ${emailResult.error}`,
        };
      }
    }

    return {
      success: true,
      message:
        "If this email is registered, you will receive a password reset link shortly.",
    };
  } catch (err: any) {
    return {
      success: false,
      error:
        authDatabaseErrorMessage(err) ||
        err.message ||
        "An unexpected error occurred.",
    };
  }
}

export async function resetPasswordAction(token: string, passwordStr: string) {
  try {
    if (!token || !passwordStr || passwordStr.length < 8) {
      return {
        success: false,
        error:
          "Token is required and new password must be at least 8 characters long.",
      };
    }

    // Verify token
    const email = await verifyPasswordResetToken(token);
    if (!email) {
      return {
        success: false,
        error: "Invalid or expired password reset link.",
      };
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { success: false, error: "User not found." };
    }

    const passwordHash = hashPassword(passwordStr);

    // Update password, unlock, reset failed attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    return {
      success: true,
      message: "Password has been reset successfully! You can now log in.",
    };
  } catch (err: any) {
    return {
      success: false,
      error:
        authDatabaseErrorMessage(err) ||
        err.message ||
        "An error occurred during password reset.",
    };
  }
}

export async function verifyEmailAction(token: string) {
  try {
    if (!token) {
      return { success: false, error: "Verification token is required." };
    }

    const email = await verifyEmailToken(token);
    if (!email) {
      return {
        success: false,
        error: "Invalid or expired email verification link.",
      };
    }

    return {
      success: true,
      message: "Email has been verified successfully! You can now log in.",
    };
  } catch (err: any) {
    return {
      success: false,
      error:
        authDatabaseErrorMessage(err) ||
        err.message ||
        "An error occurred during email verification.",
    };
  }
}

// ─────────────────────────────────────────
// 5. Onboarding Passenger Flow
// ─────────────────────────────────────────

export async function onboardPassengerAction(
  firstName: string,
  lastName: string,
  phone: string,
  passportNo: string,
  nationality: string,
  dateOfBirthStr: string,
) {
  try {
    const session = await getActiveSession();
    if (!session) {
      return { success: false, error: "Unauthorized." };
    }

    if (!firstName || !lastName || !passportNo || !nationality) {
      return {
        success: false,
        error:
          "First name, last name, passport number, and nationality are required.",
      };
    }

    if (!dateOfBirthStr || !isAtLeast18(dateOfBirthStr)) {
      return {
        success: false,
        error:
          "Passengers must be at least 18 years old to complete onboarding.",
      };
    }

    // Check unique passport
    const existing = await prisma.passenger.findUnique({
      where: { passportNumber: passportNo },
    });

    if (existing) {
      return {
        success: false,
        error: "A passenger with this passport number is already registered.",
      };
    }

    // Insert passenger record
    await prisma.passenger.create({
      data: {
        userId: session.userId,
        firstName,
        lastName,
        phone: phone || null,
        passportNumber: passportNo,
        nationality,
        dateOfBirth: dateOfBirthStr ? new Date(dateOfBirthStr) : null,
      },
    });

    // Regenerate session cookie payload to set onboardingCompleted = true
    const updatedPayload: SessionPayload = {
      ...session,
      onboardingCompleted: true,
    };

    const cookieValue = await generateSessionCookie(updatedPayload);
    const expiresAtDate = new Date(updatedPayload.expiresAt);

    // Update cookie
    const cookieStore = await cookies();
    cookieStore.set("kq_session", cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAtDate,
      path: "/",
    });

    return { success: true, message: "Onboarding completed successfully!" };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "An error occurred during onboarding.",
    };
  }
}

// ─────────────────────────────────────────
// 6. Profile Management
// ─────────────────────────────────────────

export async function getProfileInfo() {
  try {
    const session = await getActiveSession();
    if (!session) return null;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        passengerProfile: true,
      },
    });

    if (!user) return null;

    // Get active sessions
    const activeSessions = await prisma.session.findMany({
      where: {
        userId: user.id,
        isValid: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    // Normalize passenger shape for UI and convert DOB to YYYY-MM-DD for date inputs
    const passenger = user.passengerProfile
      ? {
          id: user.passengerProfile.id,
          firstName: user.passengerProfile.firstName,
          lastName: user.passengerProfile.lastName,
          phone: user.passengerProfile.phone || null,
          passportNumber: user.passengerProfile.passportNumber || null,
          nationality: user.passengerProfile.nationality || null,
          dateOfBirth: user.passengerProfile.dateOfBirth
            ? user.passengerProfile.dateOfBirth.toISOString().split("T")[0]
            : null,
          frequentFlyerNo: user.passengerProfile.frequentFlyerNo || null,
          createdAt: user.passengerProfile.createdAt.toISOString(),
          updatedAt: user.passengerProfile.updatedAt.toISOString(),
        }
      : null;

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        avatarUrl: user.avatarUrl,
      },
      passenger,
      activeSessions: activeSessions.map(
        (s: {
          id: string;
          ipAddress: string | null;
          userAgent: string | null;
          createdAt: Date;
        }) => ({
          id: s.id,
          ipAddress: s.ipAddress,
          userAgent: s.userAgent,
          createdAt: s.createdAt,
          isCurrent: s.id === session.sessionId,
        }),
      ),
    };
  } catch {
    return null;
  }
}

export async function updateProfileSettingsAction(
  name: string,
  firstName?: string,
  lastName?: string,
  phone?: string,
  passportNo?: string,
  nationality?: string,
  dateOfBirth?: string,
  avatarBase64?: string, // For mock upload support
) {
  try {
    const session = await getActiveSession();
    if (!session) return { success: false, error: "Unauthorized." };

    const updateData: any = { name };
    if (avatarBase64) {
      updateData.avatarUrl = avatarBase64;
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
    });

    // Update passenger specific info if PASSENGER
    if (session.role === "PASSENGER") {
      if (!firstName || !lastName) {
        return {
          success: false,
          error: "First name and last name are required for passengers.",
        };
      }

      if (dateOfBirth && !isAtLeast18(dateOfBirth)) {
        return {
          success: false,
          error:
            "Passengers must be at least 18 years old to update their profile.",
        };
      }

      // Check passport collision
      if (passportNo) {
        const collision = await prisma.passenger.findUnique({
          where: { passportNumber: passportNo },
        });

        if (collision && collision.userId !== session.userId) {
          return {
            success: false,
            error:
              "Passport number is already registered by another passenger.",
          };
        }
      }

      await prisma.passenger.upsert({
        where: { userId: session.userId },
        update: {
          firstName,
          lastName,
          phone: phone || null,
          passportNumber: passportNo || null,
          nationality: nationality || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        },
        create: {
          userId: session.userId,
          firstName,
          lastName,
          phone: phone || null,
          passportNumber: passportNo || null,
          nationality: nationality || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        },
      });
    }

    return { success: true, message: "Profile updated successfully." };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "An error occurred while updating profile.",
    };
  }
}

export async function toggle2FAAction(enable: boolean) {
  try {
    const session = await getActiveSession();
    if (!session) return { success: false, error: "Unauthorized." };

    await prisma.user.update({
      where: { id: session.userId },
      data: { twoFactorEnabled: enable },
    });

    return {
      success: true,
      message: `Two-Factor Authentication has been ${enable ? "enabled" : "disabled"}.`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "An error occurred." };
  }
}

export async function changePasswordAction(
  currentPasswordStr: string,
  newPasswordStr: string,
) {
  try {
    const session = await getActiveSession();
    if (!session) return { success: false, error: "Unauthorized." };

    if (!currentPasswordStr || !newPasswordStr || newPasswordStr.length < 8) {
      return {
        success: false,
        error:
          "Passwords are required and new password must be at least 8 characters.",
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { passwordHash: true },
    });

    if (!user) return { success: false, error: "User not found." };

    const valid = verifyPassword(currentPasswordStr, user.passwordHash);
    if (!valid) {
      return { success: false, error: "Incorrect current password." };
    }

    const newHash = hashPassword(newPasswordStr);
    await prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash: newHash },
    });

    return { success: true, message: "Password changed successfully." };
  } catch (err: any) {
    return { success: false, error: err.message || "An error occurred." };
  }
}

export async function revokeActiveSessionAction(sessionId: string) {
  try {
    const session = await getActiveSession();
    if (!session) return { success: false, error: "Unauthorized." };

    // Revoke selected session
    await prisma.session.updateMany({
      where: { id: sessionId, userId: session.userId },
      data: { isValid: false },
    });

    return { success: true, message: "Session revoked successfully." };
  } catch (err: any) {
    return { success: false, error: err.message || "An error occurred." };
  }
}
