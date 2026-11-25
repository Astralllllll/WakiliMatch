/**
 * scripts/generate-admin-code.js
 *
 * Generates (or hashes a supplied) admin access code for the secret-code
 * admin sign-in (Deliverable 4, bug 3). The plaintext code is printed to
 * the terminal ONCE and never written anywhere - only its scrypt hash is
 * saved, to .env.local (gitignored via the existing `*.local` rule), as
 * ADMIN_ACCESS_CODE_HASH.
 *
 * Usage:
 *   node scripts/generate-admin-code.js              # generates a random code
 *   node scripts/generate-admin-code.js "my-own-code" # hashes a code you choose
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashPassword } from '../services/passwordHash.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_LOCAL_PATH = path.join(__dirname, '..', '.env.local');
const ENV_VAR_NAME = 'ADMIN_ACCESS_CODE_HASH';

function generateRandomCode() {
  // Readable groups, e.g. XXXX-XXXX-XXXX-XXXX, from a cryptographically
  // random source - plenty of entropy for a secret that's typed rarely and
  // rate-limited on every attempt.
  const raw = crypto.randomBytes(12).toString('hex').toUpperCase();
  return raw.match(/.{1,4}/g).join('-');
}

function writeEnvLocal(hash) {
  const line = `${ENV_VAR_NAME}=${hash}`;
  if (!fs.existsSync(ENV_LOCAL_PATH)) {
    fs.writeFileSync(ENV_LOCAL_PATH, `${line}\n`, 'utf8');
    return;
  }

  const existing = fs.readFileSync(ENV_LOCAL_PATH, 'utf8');
  const lines = existing.split(/\r?\n/).filter((l) => l.trim() !== '');
  const idx = lines.findIndex((l) => l.startsWith(`${ENV_VAR_NAME}=`));
  if (idx >= 0) {
    lines[idx] = line;
  } else {
    lines.push(line);
  }
  fs.writeFileSync(ENV_LOCAL_PATH, lines.join('\n') + '\n', 'utf8');
}

const suppliedCode = process.argv[2];
const code = suppliedCode || generateRandomCode();
const hash = hashPassword(code);

writeEnvLocal(hash);

console.log('');
console.log('Admin access code (shown once - it is not saved anywhere):');
console.log('');
console.log(`  ${code}`);
console.log('');
console.log(`Its hash was written to ${ENV_LOCAL_PATH} as ${ENV_VAR_NAME}.`);
console.log('Restart the server for the new value to take effect.');
console.log('');
