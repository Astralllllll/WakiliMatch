/**
 * services/adminAuth.js
 *
 * Supporting logic for the secret-code admin sign-in (Deliverable 4,
 * bug 3): rate limiting, the admin_login_attempts audit trail, and
 * short-lived admin session tokens. There is no session/token mechanism
 * anywhere else in this app (flagged repo-wide, out of scope to add for
 * every role) - this is a small, additive, admin-only mechanism so admin
 * routes can have real server-side enforcement instead of none at all.
 */
import crypto from 'crypto';
import pool from '../db.js';

const WINDOW_MINUTES = 15;
export const MAX_FAILED_ATTEMPTS = 5;
const ADMIN_SESSION_TTL_MINUTES = 120; // "shorter lifetime" - the only session in the app at all today

/** Pure decision logic, kept separate from the DB query so it's unit-testable. */
export function isAdminLoginRateLimited({ emailFailureCount, ipFailureCount, maxAttempts = MAX_FAILED_ATTEMPTS }) {
  return emailFailureCount >= maxAttempts || ipFailureCount >= maxAttempts;
}

export async function getRecentFailureCounts(email, ip) {
  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE email_attempted = $1) AS email_failures,
       COUNT(*) FILTER (WHERE ip_address = $2) AS ip_failures
     FROM admin_login_attempts
     WHERE success = false
       AND created_at > NOW() - ($3 || ' minutes')::interval`,
    [email, ip, String(WINDOW_MINUTES)]
  );
  const row = result.rows[0];
  return {
    emailFailureCount: Number(row.email_failures),
    ipFailureCount: Number(row.ip_failures),
  };
}

/** Never pass the password or the admin code here - only the outcome. */
export async function recordAdminLoginAttempt({ email, ip, success }) {
  await pool.query(
    `INSERT INTO admin_login_attempts (email_attempted, ip_address, success) VALUES ($1, $2, $3)`,
    [email || null, ip || null, success]
  );
}

export async function createAdminSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MINUTES * 60 * 1000);
  await pool.query(
    `INSERT INTO admin_sessions (session_token, user_id, expires_at) VALUES ($1, $2, $3)`,
    [token, userId, expiresAt]
  );
  return { token, expiresAt };
}

/** Resolves a session token to its admin user, or null if missing/expired/
 * no longer an Admin account (e.g. role was changed after the session was
 * issued) - re-checking the role here, not trusting it was true forever. */
export async function getAdminSessionUser(token) {
  if (!token) return null;
  const result = await pool.query(
    `SELECT s.user_id, u.role
     FROM admin_sessions s
     JOIN Users u ON u.user_id = s.user_id
     WHERE s.session_token = $1 AND s.expires_at > NOW()`,
    [token]
  );
  if (!result.rows.length || result.rows[0].role !== 'Admin') return null;
  return { userId: result.rows[0].user_id };
}
