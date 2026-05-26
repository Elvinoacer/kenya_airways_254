import crypto from "node:crypto";
import { prisma } from "./prisma";
import { signData, verifyData, verifySessionCookie, generateSessionCookie, SessionPayload } from "./session-cookie";

export { signData, verifyData, verifySessionCookie, generateSessionCookie, type SessionPayload };

const COOKIE_NAME = "kq_session";

// ─────────────────────────────────────────
// Cryptography: Password Hashing (PBKDF2)
// ─────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const checkHash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
    return hash === checkHash;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────
// Database Session Management
// ─────────────────────────────────────────

export async function createDbSession(
  userId: string,
  role: string,
  ipAddress: string | null,
  userAgent: string | null,
  rememberMe: boolean,
): Promise<{ sessionId: string; expiresAt: Date; cookieValue: string }> {
  const sessionId = crypto.randomUUID();
  const duration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 days or 24 hours
  const expiresAt = new Date(Date.now() + duration);

  // Check onboarding status
  const passenger = await prisma.passenger.findUnique({
    where: { userId },
  });

  // Passenger role requires onboarding, STAFF/ADMIN bypass onboarding
  const onboardingCompleted = role !== "PASSENGER" || !!passenger;

  // Insert session
  await prisma.session.create({
    data: {
      id: sessionId,
      sessionToken: sessionId,
      userId,
      ipAddress,
      userAgent,
      expiresAt,
      isValid: true,
    },
  });

  const payload: SessionPayload = {
    sessionId,
    userId,
    role,
    onboardingCompleted,
    expiresAt: expiresAt.getTime(),
  };

  const cookieValue = await generateSessionCookie(payload);

  return { sessionId, expiresAt, cookieValue };
}

// Revoke a single session
export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { isValid: false },
  });
}

// Revoke all user sessions (Logout from all devices)
export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId },
    data: { isValid: false },
  });
}

// Statefully verify session against database
export async function isSessionActiveInDb(sessionId: string): Promise<boolean> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { isValid: true, expiresAt: true },
  });
  if (!session) return false;
  if (!session.isValid) return false;

  return session.expiresAt.getTime() > Date.now();
}

// ─────────────────────────────────────────
// Suspicious Login & Throttling
// ─────────────────────────────────────────

// Record login attempt (failed or successful)
export async function recordLoginAttempt(email: string, ipAddress: string): Promise<void> {
  await prisma.loginAttempt.create({
    data: { email, ipAddress },
  });
}

// Throttle check: Maximum 10 login attempts in last 5 minutes per IP or email
export async function isLoginThrottled(email: string, ipAddress: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - 5 * 60 * 1000);
  const attempts = await prisma.loginAttempt.count({
    where: {
      createdAt: { gt: windowStart },
      OR: [{ email }, { ipAddress }],
    },
  });
  return attempts >= 10;
}

// Increments failed attempts and locks account if it reaches 5 failures
export async function handleFailedLogin(user: any): Promise<{ lockedUntil: string | null; remainingAttempts: number }> {
  const attempts = (user.failedAttempts || 0) + 1;
  let lockedUntilDate: Date | null = null;

  if (attempts >= 5) {
    lockedUntilDate = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: attempts, lockedUntil: lockedUntilDate },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: attempts },
    });
  }

  return {
    lockedUntil: lockedUntilDate ? lockedUntilDate.toISOString() : null,
    remainingAttempts: Math.max(0, 5 - attempts),
  };
}

// Reset failed login attempts on success
export async function resetFailedLoginAttempts(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedAttempts: 0, lockedUntil: null },
  });
}

// Check for suspicious login: compares request IP/UA with user's last 5 sessions
export async function checkSuspiciousLogin(
  userId: string,
  ipAddress: string | null,
  userAgent: string | null,
): Promise<boolean> {
  if (!ipAddress || !userAgent) return false;

  const previousSessions = await prisma.session.findMany({
    where: { userId, isValid: true },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { ipAddress: true, userAgent: true },
  });

  if (previousSessions.length === 0) return false;

  const ipMatched = previousSessions.some(
    (s: { ipAddress: string | null; userAgent: string | null }) => s.ipAddress === ipAddress,
  );
  const uaMatched = previousSessions.some(
    (s: { ipAddress: string | null; userAgent: string | null }) => s.userAgent === userAgent,
  );

  if (!ipMatched && !uaMatched) {
    await prisma.suspiciousAlert.create({
      data: { userId, ipAddress, userAgent },
    });
    return true;
  }

  return false;
}

// ─────────────────────────────────────────
// Verification Tokens & 2FA Codes
// ─────────────────────────────────────────

export async function createVerificationToken(
  email: string,
  type: "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "MFA_CODE",
  expiresInMs: number = 24 * 60 * 60 * 1000, // 24 hours default
): Promise<{ token: string; code: string }> {
  const token = crypto.randomBytes(32).toString("hex");
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + expiresInMs);

  // Prisma doesn't have a direct upsert that handles clearing previous tokens easily without a unique key,
  // but we can delete and insert since type is an enum.
  await prisma.verificationToken.deleteMany({
    where: { email, type },
  });

  await prisma.verificationToken.create({
    data: {
      email,
      token,
      code,
      type,
      expiresAt,
    },
  });

  return { token, code };
}

export async function verifyEmailToken(token: string): Promise<string | null> {
  const row = await prisma.verificationToken.findFirst({
    where: { token, type: "EMAIL_VERIFICATION" },
  });

  if (!row) return null;

  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.verificationToken.delete({ where: { token } });
    return null;
  }

  await prisma.user.update({
    where: { email: row.email },
    data: { emailVerified: true },
  });

  await prisma.verificationToken.delete({ where: { token } });

  return row.email;
}

export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  const row = await prisma.verificationToken.findFirst({
    where: { token, type: "PASSWORD_RESET" },
  });

  if (!row) return null;

  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.verificationToken.delete({ where: { token } });
    return null;
  }

  return row.email;
}
