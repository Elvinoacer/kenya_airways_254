import { query, UserRow, SessionRow, VerificationTokenRow } from './db';
import crypto from 'node:crypto';
import {
  signData,
  verifyData,
  verifySessionCookie,
  generateSessionCookie,
  SessionPayload
} from './session-cookie';

export {
  signData,
  verifyData,
  verifySessionCookie,
  generateSessionCookie,
  type SessionPayload
};

const COOKIE_NAME = 'kq_session';

// ─────────────────────────────────────────
// Cryptography: Password Hashing (PBKDF2)
// ─────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':');
    const checkHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
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
  rememberMe: boolean
): Promise<{ sessionId: string; expiresAt: Date; cookieValue: string }> {
  const sessionId = crypto.randomUUID();
  const duration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 days or 24 hours
  const expiresAt = new Date(Date.now() + duration);

  // Check onboarding status
  const passenger = query.get<{ id: string }>(
    'SELECT id FROM passengers WHERE user_id = ?',
    [userId]
  );
  
  // Passenger role requires onboarding, STAFF/ADMIN bypass onboarding
  const onboardingCompleted = role !== 'PASSENGER' || !!passenger;

  // Insert session into SQLite
  query.run(
    `INSERT INTO sessions (id, session_token, user_id, ip_address, user_agent, expires_at, is_valid)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [sessionId, sessionId, userId, ipAddress, userAgent, expiresAt.toISOString()]
  );

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
export function revokeSession(sessionId: string): void {
  query.run('UPDATE sessions SET is_valid = 0 WHERE id = ?', [sessionId]);
}

// Revoke all user sessions (Logout from all devices)
export function revokeAllUserSessions(userId: string): void {
  query.run('UPDATE sessions SET is_valid = 0 WHERE user_id = ?', [userId]);
}

// Statefully verify session against database
export function isSessionActiveInDb(sessionId: string): boolean {
  const row = query.get<SessionRow>(
    'SELECT is_valid, expires_at FROM sessions WHERE id = ?',
    [sessionId]
  );
  if (!row) return false;
  if (row.is_valid === 0) return false;
  
  const expiry = new Date(row.expires_at).getTime();
  return expiry > Date.now();
}

// ─────────────────────────────────────────
// Suspicious Login & Throttling
// ─────────────────────────────────────────

// Record login attempt (failed or successful)
export function recordLoginAttempt(email: string, ipAddress: string): void {
  const id = crypto.randomUUID();
  query.run(
    'INSERT INTO login_attempts (id, email, ip_address) VALUES (?, ?, ?)',
    [id, email, ipAddress]
  );
}

// Throttle check: Maximum 10 login attempts in last 5 minutes per IP or email
export function isLoginThrottled(email: string, ipAddress: string): boolean {
  const windowStart = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  const attempts = query.get<{ count: number }>(
    `SELECT COUNT(*) as count FROM login_attempts 
     WHERE (email = ? OR ip_address = ?) AND timestamp > ?`,
    [email, ipAddress, windowStart]
  );

  return (attempts?.count ?? 0) >= 10;
}

// Increments failed attempts and locks account if it reaches 5 failures
export function handleFailedLogin(user: UserRow): { lockedUntil: string | null; remainingAttempts: number } {
  const attempts = user.failed_attempts + 1;
  let lockedUntilStr: string | null = null;

  if (attempts >= 5) {
    const lockTime = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
    lockedUntilStr = lockTime.toISOString();
    
    query.run(
      'UPDATE users SET failed_attempts = ?, locked_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [attempts, lockedUntilStr, user.id]
    );
  } else {
    query.run(
      'UPDATE users SET failed_attempts = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [attempts, user.id]
    );
  }

  return {
    lockedUntil: lockedUntilStr,
    remainingAttempts: Math.max(0, 5 - attempts),
  };
}

// Reset failed login attempts on success
export function resetFailedLoginAttempts(userId: string): void {
  query.run(
    'UPDATE users SET failed_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [userId]
  );
}

// Check for suspicious login: compares request IP/UA with user's last 5 sessions
export async function checkSuspiciousLogin(
  userId: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<boolean> {
  if (!ipAddress || !userAgent) return false;

  // Fetch last 5 valid sessions
  const previousSessions = query.all<SessionRow>(
    `SELECT ip_address, user_agent FROM sessions 
     WHERE user_id = ? AND is_valid = 1 
     ORDER BY created_at DESC LIMIT 5`,
    [userId]
  );

  if (previousSessions.length === 0) return false; // First login

  // Check if IP or User Agent is completely new compared to the last 5 sessions
  const ipMatched = previousSessions.some((s) => s.ip_address === ipAddress);
  const uaMatched = previousSessions.some((s) => s.user_agent === userAgent);

  // If both IP and User-Agent changed, flag as suspicious
  if (!ipMatched && !uaMatched) {
    const alertId = crypto.randomUUID();
    query.run(
      'INSERT INTO suspicious_alerts (id, user_id, ip_address, user_agent) VALUES (?, ?, ?, ?)',
      [alertId, userId, ipAddress, userAgent]
    );
    return true;
  }

  return false;
}

// ─────────────────────────────────────────
// Verification Tokens & 2FA Codes
// ─────────────────────────────────────────

export function createVerificationToken(
  email: string,
  type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'MFA_CODE',
  expiresInMs: number = 24 * 60 * 60 * 1000 // 24 hours default
): { token: string; code: string } {
  const token = crypto.randomBytes(32).toString('hex');
  
  // 6 digit numeric code for MFA/2FA, or reset convenience
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + expiresInMs).toISOString();

  // Clear previous tokens of the same type for this email
  query.run(
    'DELETE FROM verification_tokens WHERE email = ? AND type = ?',
    [email, type]
  );

  const id = crypto.randomUUID();
  query.run(
    `INSERT INTO verification_tokens (id, email, token, expires_at, type, code)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, email, token, expiresAt, type, code]
  );

  return { token, code };
}

export function verifyEmailToken(token: string): string | null {
  const row = query.get<VerificationTokenRow>(
    "SELECT email, expires_at FROM verification_tokens WHERE token = ? AND type = 'EMAIL_VERIFICATION'",
    [token]
  );

  if (!row) return null;
  
  const expiry = new Date(row.expires_at).getTime();
  if (expiry < Date.now()) {
    query.run('DELETE FROM verification_tokens WHERE token = ?', [token]);
    return null;
  }

  // Set email verified on user
  query.run(
    "UPDATE users SET email_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE email = ?",
    [row.email]
  );

  // Clean up token
  query.run('DELETE FROM verification_tokens WHERE token = ?', [token]);

  return row.email;
}

export function verifyPasswordResetToken(token: string): string | null {
  const row = query.get<VerificationTokenRow>(
    "SELECT email, expires_at FROM verification_tokens WHERE token = ? AND type = 'PASSWORD_RESET'",
    [token]
  );

  if (!row) return null;

  const expiry = new Date(row.expires_at).getTime();
  if (expiry < Date.now()) {
    query.run('DELETE FROM verification_tokens WHERE token = ?', [token]);
    return null;
  }

  return row.email;
}
