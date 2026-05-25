'use server';

import { cookies } from 'next/headers';
import { query, UserRow, PassengerRow, SessionRow } from '../../lib/db';
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
  SessionPayload
} from '../../lib/auth-session';
import crypto from 'node:crypto';

// Helper to get active session from cookies
async function getActiveSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const cookieVal = cookieStore.get('kq_session')?.value;
  return verifySessionCookie(cookieVal);
}

// ─────────────────────────────────────────
// 1. User Registration
// ─────────────────────────────────────────

export async function registerAction(
  email: string,
  password: string,
  name: string,
  role: 'PASSENGER' | 'STAFF' | 'ADMIN' = 'PASSENGER'
) {
  try {
    if (!email || !password || password.length < 8) {
      return { success: false, error: 'Email is required and password must be at least 8 characters long.' };
    }

    // Check if user already exists
    const existing = query.get<UserRow>('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return { success: false, error: 'A user with this email address already exists.' };
    }

    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);

    // Save user
    query.run(
      `INSERT INTO users (id, email, name, password_hash, role, email_verified, failed_attempts)
       VALUES (?, ?, ?, ?, ?, 0, 0)`,
      [userId, email, name || null, passwordHash, role]
    );

    // Generate email verification token
    const { token } = createVerificationToken(email, 'EMAIL_VERIFICATION');

    // Simulate sending email by printing to logs
    console.log('\n=== [MOCK EMAIL] EMAIL VERIFICATION LINK ===');
    console.log(`To: ${email}`);
    console.log(`Link: http://localhost:3000/verify-email?token=${token}`);
    console.log('============================================\n');

    return { success: true, message: 'Registration successful! Please check your email for a verification link.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred during registration.' };
  }
}

// ─────────────────────────────────────────
// 2. Login & 2FA
// ─────────────────────────────────────────

export async function loginAction(
  email: string,
  password: string,
  rememberMe: boolean,
  ipAddress: string | null = '127.0.0.1',
  userAgent: string | null = 'unknown'
) {
  try {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    const ip = ipAddress || '127.0.0.1';

    // Throttle login check
    if (isLoginThrottled(email, ip)) {
      return { success: false, error: 'Too many login attempts. Please try again in 5 minutes.' };
    }

    // Record login attempt
    recordLoginAttempt(email, ip);

    // Find user
    const user = query.get<UserRow>('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return { success: false, error: 'Invalid email or password.' };
    }

    // Check account lockout
    if (user.locked_until) {
      const lockExpiry = new Date(user.locked_until).getTime();
      if (lockExpiry > Date.now()) {
        const minutesLeft = Math.ceil((lockExpiry - Date.now()) / 60000);
        return { success: false, error: `Account is locked. Please try again in ${minutesLeft} minutes.` };
      } else {
        // Lock expired, reset attempts
        resetFailedLoginAttempts(user.id);
        user.locked_until = null;
        user.failed_attempts = 0;
      }
    }

    // Verify password
    const passwordMatch = verifyPassword(password, user.password_hash);
    if (!passwordMatch) {
      // Re-fetch user details for updated lock parameters
      const { lockedUntil, remainingAttempts } = handleFailedLogin(user);
      if (lockedUntil) {
        return { success: false, error: 'Too many failed attempts. Your account has been locked for 15 minutes.' };
      }
      return { success: false, error: `Invalid email or password. ${remainingAttempts} attempts remaining before account lock.` };
    }

    // Reset failed login attempts on successful credentials match
    resetFailedLoginAttempts(user.id);

    // Check if 2FA (Two-Factor Authentication) is enabled
    if (user.two_factor_enabled === 1) {
      // Generate 2FA Verification Code
      const { code } = createVerificationToken(email, 'MFA_CODE', 5 * 60 * 1000); // 5 mins expiry

      console.log('\n=== [MOCK EMAIL] 2FA LOGIN VERIFICATION CODE ===');
      console.log(`To: ${email}`);
      console.log(`Your 2FA Login Code: ${code}`);
      console.log('================================================\n');

      return {
        success: true,
        twoFactorRequired: true,
        email,
        rememberMe
      };
    }

    // Check for suspicious login (IP or UA change)
    const isSuspicious = await checkSuspiciousLogin(user.id, ip, userAgent);
    if (isSuspicious) {
      console.log(`\n[SECURITY ALERT] Suspicious login detected for user ${email} from IP: ${ip}, UA: ${userAgent}\n`);
    }

    // Create session
    const { expiresAt, cookieValue } = await createDbSession(
      user.id,
      user.role,
      ip,
      userAgent,
      rememberMe
    );

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('kq_session', cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/'
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred during login.' };
  }
}

export async function verify2FALoginAction(
  email: string,
  code: string,
  rememberMe: boolean,
  ipAddress: string | null = '127.0.0.1',
  userAgent: string | null = 'unknown'
) {
  try {
    if (!email || !code) {
      return { success: false, error: 'Email and verification code are required.' };
    }

    // Validate 2FA code in SQLite
    const row = query.get<{ expires_at: string }>(
      "SELECT expires_at FROM verification_tokens WHERE email = ? AND code = ? AND type = 'MFA_CODE'",
      [email, code]
    );

    if (!row) {
      return { success: false, error: 'Invalid 2FA code.' };
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      query.run("DELETE FROM verification_tokens WHERE email = ? AND type = 'MFA_CODE'", [email]);
      return { success: false, error: '2FA code has expired. Please log in again.' };
    }

    // Clean up code
    query.run("DELETE FROM verification_tokens WHERE email = ? AND type = 'MFA_CODE'", [email]);

    // Fetch user
    const user = query.get<UserRow>('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return { success: false, error: 'User not found.' };
    }

    const ip = ipAddress || '127.0.0.1';

    // Check suspicious login
    await checkSuspiciousLogin(user.id, ip, userAgent);

    // Create session
    const { expiresAt, cookieValue } = await createDbSession(
      user.id,
      user.role,
      ip,
      userAgent,
      rememberMe
    );

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('kq_session', cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/'
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred during 2FA verification.' };
  }
}

// ─────────────────────────────────────────
// 3. Logout flows
// ─────────────────────────────────────────

export async function logoutAction() {
  const session = await getActiveSession();
  if (session) {
    revokeSession(session.sessionId);
  }

  // Clear cookie
  const cookieStore = await cookies();
  cookieStore.delete('kq_session');

  return { success: true };
}

export async function logoutAllDevicesAction() {
  const session = await getActiveSession();
  if (session) {
    revokeAllUserSessions(session.userId);
  }

  // Clear cookie
  const cookieStore = await cookies();
  cookieStore.delete('kq_session');

  return { success: true };
}

// ─────────────────────────────────────────
// 4. Forgot / Reset Password
// ─────────────────────────────────────────

export async function forgotPasswordAction(email: string) {
  try {
    if (!email) {
      return { success: false, error: 'Email is required.' };
    }

    const user = query.get<UserRow>('SELECT email FROM users WHERE email = ?', [email]);
    
    // Always return success to prevent email enumeration attacks
    if (user) {
      const { token } = createVerificationToken(email, 'PASSWORD_RESET', 30 * 60 * 1000); // 30 mins expiry

      console.log('\n=== [MOCK EMAIL] PASSWORD RESET LINK ===');
      console.log(`To: ${email}`);
      console.log(`Link: http://localhost:3000/reset-password?token=${token}`);
      console.log('========================================\n');
    }

    return { success: true, message: 'If this email is registered, you will receive a password reset link shortly.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

export async function resetPasswordAction(token: string, passwordStr: string) {
  try {
    if (!token || !passwordStr || passwordStr.length < 8) {
      return { success: false, error: 'Token is required and new password must be at least 8 characters long.' };
    }

    // Verify token
    const email = verifyPasswordResetToken(token);
    if (!email) {
      return { success: false, error: 'Invalid or expired password reset link.' };
    }

    const user = query.get<UserRow>('SELECT id FROM users WHERE email = ?', [email]);
    if (!user) {
      return { success: false, error: 'User not found.' };
    }

    const passwordHash = hashPassword(passwordStr);

    // Update password, unlock, reset failed attempts
    query.run(
      `UPDATE users 
       SET password_hash = ?, failed_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [passwordHash, user.id]
    );

    // Delete token
    query.run("DELETE FROM verification_tokens WHERE token = ? AND type = 'PASSWORD_RESET'", [token]);

    return { success: true, message: 'Password has been reset successfully! You can now log in.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred during password reset.' };
  }
}

export async function verifyEmailAction(token: string) {
  try {
    if (!token) {
      return { success: false, error: 'Verification token is required.' };
    }

    const email = verifyEmailToken(token);
    if (!email) {
      return { success: false, error: 'Invalid or expired email verification link.' };
    }

    return { success: true, message: 'Email has been verified successfully! You can now log in.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred during email verification.' };
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
  dateOfBirthStr: string
) {
  try {
    const session = await getActiveSession();
    if (!session) {
      return { success: false, error: 'Unauthorized.' };
    }

    if (!firstName || !lastName || !passportNo || !nationality) {
      return { success: false, error: 'First name, last name, passport number, and nationality are required.' };
    }

    // Check unique passport
    const existing = query.get<{ id: string }>('SELECT id FROM passengers WHERE passport_no = ?', [passportNo]);
    if (existing) {
      return { success: false, error: 'A passenger with this passport number is already registered.' };
    }

    const passengerId = crypto.randomUUID();

    // Insert passenger record
    query.run(
      `INSERT INTO passengers (id, user_id, first_name, last_name, phone, passport_no, nationality, date_of_birth)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [passengerId, session.userId, firstName, lastName, phone || null, passportNo, nationality, dateOfBirthStr || null]
    );

    // Regenerate session cookie payload to set onboardingCompleted = true
    const updatedPayload: SessionPayload = {
      ...session,
      onboardingCompleted: true
    };

    const cookieValue = await generateSessionCookie(updatedPayload);
    const expiresAtDate = new Date(updatedPayload.expiresAt);

    // Update cookie
    const cookieStore = await cookies();
    cookieStore.set('kq_session', cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAtDate,
      path: '/'
    });

    return { success: true, message: 'Onboarding completed successfully!' };
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred during onboarding.' };
  }
}

// ─────────────────────────────────────────
// 6. Profile Management
// ─────────────────────────────────────────

export async function getProfileInfo() {
  try {
    const session = await getActiveSession();
    if (!session) return null;

    const user = query.get<UserRow>('SELECT id, email, name, role, two_factor_enabled, avatar_url FROM users WHERE id = ?', [session.userId]);
    if (!user) return null;

    let passenger: PassengerRow | undefined;
    if (user.role === 'PASSENGER') {
      passenger = query.get<PassengerRow>('SELECT * FROM passengers WHERE user_id = ?', [user.id]);
    }

    // Get active sessions
    const activeSessions = query.all<SessionRow>(
      `SELECT id, ip_address, user_agent, created_at FROM sessions 
       WHERE user_id = ? AND is_valid = 1 AND datetime(expires_at) > datetime('now')
       ORDER BY created_at DESC`,
      [user.id]
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        twoFactorEnabled: user.two_factor_enabled === 1,
        avatarUrl: user.avatar_url,
      },
      passenger,
      activeSessions: activeSessions.map(s => ({
        id: s.id,
        ipAddress: s.ip_address,
        userAgent: s.user_agent,
        createdAt: s.created_at,
        isCurrent: s.id === session.sessionId
      }))
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
  avatarBase64?: string // For mock upload support
) {
  try {
    const session = await getActiveSession();
    if (!session) return { success: false, error: 'Unauthorized.' };

    // Update user name and avatar
    if (avatarBase64) {
      query.run(
        'UPDATE users SET name = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, avatarBase64, session.userId]
      );
    } else {
      query.run(
        'UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, session.userId]
      );
    }

    // Update passenger specific info if PASSENGER
    if (session.role === 'PASSENGER') {
      if (!firstName || !lastName) {
        return { success: false, error: 'First name and last name are required for passengers.' };
      }

      // Check passport collision
      if (passportNo) {
        const collision = query.get<{ id: string }>(
          'SELECT id FROM passengers WHERE passport_no = ? AND user_id != ?',
          [passportNo, session.userId]
        );
        if (collision) {
          return { success: false, error: 'Passport number is already registered by another passenger.' };
        }
      }

      query.run(
        `UPDATE passengers 
         SET first_name = ?, last_name = ?, phone = ?, passport_no = ?, nationality = ?, date_of_birth = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [firstName, lastName, phone || null, passportNo || null, nationality || null, dateOfBirth || null, session.userId]
      );
    }

    return { success: true, message: 'Profile updated successfully.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred while updating profile.' };
  }
}

export async function toggle2FAAction(enable: boolean) {
  try {
    const session = await getActiveSession();
    if (!session) return { success: false, error: 'Unauthorized.' };

    query.run(
      'UPDATE users SET two_factor_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [enable ? 1 : 0, session.userId]
    );

    return { success: true, message: `Two-Factor Authentication has been ${enable ? 'enabled' : 'disabled'}.` };
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred.' };
  }
}

export async function changePasswordAction(currentPasswordStr: string, newPasswordStr: string) {
  try {
    const session = await getActiveSession();
    if (!session) return { success: false, error: 'Unauthorized.' };

    if (!currentPasswordStr || !newPasswordStr || newPasswordStr.length < 8) {
      return { success: false, error: 'Passwords are required and new password must be at least 8 characters.' };
    }

    const user = query.get<UserRow>('SELECT password_hash FROM users WHERE id = ?', [session.userId]);
    if (!user) return { success: false, error: 'User not found.' };

    const valid = verifyPassword(currentPasswordStr, user.password_hash);
    if (!valid) {
      return { success: false, error: 'Incorrect current password.' };
    }

    const newHash = hashPassword(newPasswordStr);
    query.run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newHash, session.userId]);

    return { success: true, message: 'Password changed successfully.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred.' };
  }
}

export async function revokeActiveSessionAction(sessionId: string) {
  try {
    const session = await getActiveSession();
    if (!session) return { success: false, error: 'Unauthorized.' };

    // Revoke selected session
    query.run('UPDATE sessions SET is_valid = 0 WHERE id = ? AND user_id = ?', [sessionId, session.userId]);

    return { success: true, message: 'Session revoked successfully.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred.' };
  }
}
