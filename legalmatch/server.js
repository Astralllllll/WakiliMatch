import crypto from "crypto";
import express from "express";
import cors from "cors";
import pool from "./db.js";
import profileRoutes from "./routes/profiles.js";
import issueRoutes from "./routes/issues.js";
import matchRoutes from "./routes/matches.js";
import adminRoutes from "./routes/admin.js";
import lawyerRoutes from "./routes/lawyers.js";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const HASH_KEY_LENGTH = 64;
const HASH_COST = 14;
const HASH_SEPARATOR = ":";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, HASH_KEY_LENGTH, { N: 2 ** HASH_COST }).toString("hex");
  return `${salt}${HASH_SEPARATOR}${derived}`;
}

function verifyPassword(password, stored) {
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

function isEmail(value) {
  return /\S+@\S+\.\S+/.test(value || "");
}

function normalizeRole(role) {
  if (!role) return "";
  return role.toString().toLowerCase();
}

async function ensureUsersSchema() {
  await pool.query(`ALTER TABLE Users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)`);
}

// Middleware
app.use(cors());

app.use(express.json());
app.use('/api/profiles', profileRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/lawyers', lawyerRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, message: "Server is running" });
});

app.post("/api/auth/client/register", async (req, res) => {
  const { fullName, email, phone, password } = req.body || {};

  if (!fullName?.trim()) {
    return res.status(400).json({ field: "fullName", error: "Full name is required." });
  }
  if (!isEmail(email)) {
    return res.status(400).json({ field: "email", error: "Enter a valid email address." });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ field: "password", error: "Password must be at least 8 characters." });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const newUser = await client.query(
        `INSERT INTO Users (email, password_hash, role, full_name)
         VALUES ($1, $2, 'Client', $3)
         RETURNING user_id, email, role, full_name, created_at`,
        [email.trim().toLowerCase(), hashPassword(password), fullName.trim()]
      );

      await client.query("COMMIT");

      const user = newUser.rows[0];
      return res.status(201).json({
        user: {
          id: user.user_id,
          fullName: user.full_name || fullName.trim(),
          email: user.email,
          phone: phone || null,
          role: user.role,
        },
      });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      if (err.code === "23505") {
        return res.status(409).json({ field: "email", error: "An account with this email already exists." });
      }
      console.error("Client register failed:", err.message);
      return res.status(500).json({ error: "Server error while creating account." });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Client register connection failed:", err.message);
    return res.status(500).json({ error: "Database connection failed. Please try again." });
  }
});

app.post("/api/auth/client/login", async (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = (email || "").trim().toLowerCase();

  if (!isEmail(cleanEmail)) {
    return res.status(400).json({ field: "email", error: "Enter a valid email address." });
  }
  if (!password) {
    return res.status(400).json({ field: "password", error: "Password is required." });
  }

  try {
    const userResult = await pool.query(
      `SELECT user_id, email, password_hash, role, full_name
       FROM Users
       WHERE email = $1`,
      [cleanEmail]
    );

    const user = userResult.rows[0];
    if (!user) {
      return res.status(401).json({ field: "email", error: "No account found with this email address." });
    }

    if (normalizeRole(user.role) !== "client") {
      return res.status(400).json({ field: "role", error: `This account is registered as a ${user.role}. Please switch to the ${user.role} tab above.` });
    }

    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ field: "password", error: "Incorrect password." });
    }

    return res.json({
      user: {
        id: user.user_id,
        fullName: user.full_name || null,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Client login failed:", err.message);
    return res.status(500).json({ error: "Server error while signing in." });
  }
});

app.post("/api/auth/lawyer/register", async (req, res) => {
  const { fullName, lskNumber, email, phone, password } = req.body || {};

  if (!fullName?.trim()) {
    return res.status(400).json({ field: "fullName", error: "Full name is required." });
  }
  if (!lskNumber?.trim()) {
    return res.status(400).json({ field: "lskNumber", error: "LSK registration number is required." });
  }
  if (!isEmail(email)) {
    return res.status(400).json({ field: "email", error: "Enter a valid email address." });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ field: "password", error: "Password must be at least 8 characters." });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const newUser = await client.query(
        `INSERT INTO Users (email, password_hash, role, full_name)
         VALUES ($1, $2, 'Lawyer', $3)
         RETURNING user_id, email, role, full_name`,
        [email.trim().toLowerCase(), hashPassword(password), fullName.trim()]
      );

      await client.query(
        `INSERT INTO LawyerProfiles (user_id, lsk_registration_number, full_name, specializations)
         VALUES ($1, $2, $3, $4)`,
        [newUser.rows[0].user_id, lskNumber.trim().toUpperCase(), fullName.trim(), null]
      );

      await client.query("COMMIT");

      return res.status(201).json({
        user: {
          id: newUser.rows[0].user_id,
          fullName: newUser.rows[0].full_name || fullName.trim(),
          email: newUser.rows[0].email,
          phone: phone || null,
          lskNumber: lskNumber.trim().toUpperCase(),
          role: newUser.rows[0].role,
        },
      });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      if (err.code === "23505") {
        const duplicateField = err.constraint?.toLowerCase().includes("lsk") ? "lskNumber" : "email";
        const duplicateError = duplicateField === "lskNumber"
          ? "This LSK number is already registered."
          : "An account with this email already exists.";
        return res.status(409).json({ field: duplicateField, error: duplicateError });
      }
      console.error("Lawyer register failed:", err.message);
      return res.status(500).json({ error: "Server error while creating account." });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Lawyer register connection failed:", err.message);
    return res.status(500).json({ error: "Database connection failed. Please try again." });
  }
});

app.post("/api/auth/lawyer/login", async (req, res) => {
  const { identifier, password } = req.body || {};

  if (!identifier?.trim()) {
    return res.status(400).json({ field: "identifier", error: "Email or LSK number is required." });
  }
  if (!password) {
    return res.status(400).json({ field: "password", error: "Password is required." });
  }

  const trimmedIdentifier = identifier.trim();
  const normalizedEmail = trimmedIdentifier.toLowerCase();
  const normalizedLsk = trimmedIdentifier.toUpperCase();

  try {
    const userResult = await pool.query(
      `SELECT u.user_id, u.email, u.password_hash, u.role, u.full_name, lp.lsk_registration_number
       FROM Users u
       LEFT JOIN LawyerProfiles lp ON lp.user_id = u.user_id
       WHERE u.email = $1 OR lp.lsk_registration_number = $2
       LIMIT 1`,
      [normalizedEmail, normalizedLsk]
    );

    const user = userResult.rows[0];
    if (!user) {
      return res.status(401).json({ field: "identifier", error: "No lawyer account found with this email or LSK number." });
    }

    if (normalizeRole(user.role) !== "lawyer") {
      return res.status(400).json({ field: "role", error: `This account is registered as a ${user.role}. Please switch to the ${user.role} tab above.` });
    }

    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ field: "password", error: "Incorrect password." });
    }

    return res.json({
      user: {
        id: user.user_id,
        fullName: user.full_name || null,
        email: user.email,
        lskNumber: user.lsk_registration_number,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Lawyer login failed:", err.message);
    return res.status(500).json({ error: "Server error while signing in." });
  }
});

app.post("/api/auth/admin/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!isEmail(email)) {
    return res.status(400).json({ field: "email", error: "Enter a valid email address." });
  }
  if (!password) {
    return res.status(400).json({ field: "password", error: "Password is required." });
  }

  try {
    const userResult = await pool.query(
      `SELECT user_id, email, password_hash, role
       FROM Users
       WHERE email = $1
       LIMIT 1`,
      [email.trim().toLowerCase()]
    );

    const user = userResult.rows[0];
    if (!user || normalizeRole(user.role) !== "admin" || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ field: "password", error: "Invalid admin credentials." });
    }

    return res.json({
      user: {
        id: user.user_id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Admin login failed:", err.message);
    return res.status(500).json({ error: "Server error while signing in." });
  }
});

// =========================================================================
// PASTE THIS ROUTE INTO YOUR FILE 
// =========================================================================

// GET route to fetch all Lawyer Profiles for the browsing interface
app.get('/api/lawyers', async (req, res) => {
  try {
    // 1. Query the PostgreSQL database
    const allLawyers = await pool.query(
      `SELECT 
        profile_id, 
        user_id,
        lsk_registration_number, 
        academic_qualifications, 
        years_of_experience, 
        specializations,
        previous_cases_handled,
        price_guidance,
        success_rate
       FROM LawyerProfiles`
    );
    
    // 2. Deliver the database rows to the React interface as JSON
    res.json(allLawyers.rows);

  } catch (err) {
    console.error("Database query failed:", err.message);
    res.status(500).json({ error: "Server error while fetching lawyers" });
  }
});

// GET route to fetch a single Lawyer's Profile by their ID
app.get('/api/lawyers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const lawyer = await pool.query(
      'SELECT * FROM LawyerProfiles WHERE user_id = $1', 
      [id]
    );
    
    if (lawyer.rows.length === 0) {
      return res.status(404).json({ error: "Lawyer profile not found" });
    }

    res.json(lawyer.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================================================================

app.use((err, _req, res, next) => {
  console.error("Unhandled error:", err?.message || err);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(500).json({ error: "Server error. Please try again." });
});

// Start the server
ensureUsersSchema()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Backend server is running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize schema:", err.message);
    process.exit(1);
  });