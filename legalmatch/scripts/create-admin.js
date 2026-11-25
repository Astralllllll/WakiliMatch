/**
 * scripts/create-admin.js
 *
 * The ONLY way an Admin account should ever be created (Deliverable 4,
 * bug 3) - the public register endpoints hardcode role='Client'/'Lawyer'
 * and ignore any role the client sends, so there is no public path to an
 * Admin row at all.
 *
 * Usage:
 *   node scripts/create-admin.js <email> "<full name>" <password>
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { hashPassword } = await import('../services/passwordHash.js');
const { default: pool } = await import('../db.js');

const [, , email, fullName, password] = process.argv;

if (!email || !fullName || !password) {
  console.error('Usage: node scripts/create-admin.js <email> "<full name>" <password>');
  process.exit(1);
}
if (!/\S+@\S+\.\S+/.test(email)) {
  console.error('Error: not a valid email address.');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Error: password must be at least 8 characters.');
  process.exit(1);
}

try {
  const result = await pool.query(
    `INSERT INTO Users (email, password_hash, role, full_name)
     VALUES ($1, $2, 'Admin', $3)
     RETURNING user_id, email, created_at`,
    [email.trim().toLowerCase(), hashPassword(password), fullName.trim()]
  );
  console.log('Admin account created:', result.rows[0]);
  console.log("Don't forget the secret access code - run scripts/generate-admin-code.js if you haven't already.");
} catch (err) {
  if (err.code === '23505') {
    console.error('Error: an account with this email already exists.');
  } else {
    console.error('Error creating admin account:', err.message);
  }
  process.exit(1);
} finally {
  await pool.end();
}
