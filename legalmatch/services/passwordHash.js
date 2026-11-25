/**
 * services/passwordHash.js
 *
 * Shared scrypt password hashing, extracted from server.js so the admin
 * secret-code scripts/routes (Deliverable 4, bug 3) can hash/verify the
 * admin access code with the exact same primitive as user passwords,
 * instead of a second, parallel implementation.
 */
import crypto from "crypto";

const HASH_KEY_LENGTH = 64;
const HASH_COST = 14;
const HASH_SEPARATOR = ":";

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, HASH_KEY_LENGTH, { N: 2 ** HASH_COST }).toString("hex");
  return `${salt}${HASH_SEPARATOR}${derived}`;
}

export function verifyPassword(password, stored) {
  try {
    if (!stored || !stored.includes(HASH_SEPARATOR)) {
      return false;
    }

    const [salt, originalHash] = stored.split(HASH_SEPARATOR);
    const hashBuffer = Buffer.from(originalHash, "hex");
    if (!salt || hashBuffer.length === 0) {
      return false;
    }

    const candidateHash = crypto.scryptSync(password, salt, hashBuffer.length, { N: 2 ** HASH_COST });
    return crypto.timingSafeEqual(hashBuffer, candidateHash);
  } catch {
    return false;
  }
}
