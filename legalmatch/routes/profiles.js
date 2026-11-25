import express from 'express';
import pool from '../db.js';
import { validateLawyerProfilePayload } from '../services/lawyerProfileValidation.js';

const router = express.Router();

// POST /api/profiles/lawyer
// Creates or updates a lawyer profile.
// Called by LawyerOnboarding.jsx (web) and LawyerOnboardingScreen.kt
// (Android) via their respective saveLawyerProfile() helpers.
router.post('/lawyer', async (req, res) => {
  const {
    // Required
    user_id,
    lsk_registration_number,

    // Step 1 — Personal & Education
    full_name,
    biography,
    academic_qualifications,
    institutions,
    graduation_year,
    bar_admission_year,
    courts,
    languages,

    // Step 2 — Practice
    specializations,
    years_of_experience,
    firm_name,
    county, // lawyer's own practice county (Android onboarding only today — see validator's doc comment)

    // Step 3 — Case history & fees
    // NOTE: these are self-reported summary fields filled in once at
    // onboarding — distinct from the structured, per-case PastCases table
    // (added via POST /api/lawyers/:lawyerId/past-cases), which is what
    // the TF-IDF matching engine actually queries for relevance scoring.
    case_type_descriptions,
    previous_cases_handled,
    success_rate,
    price_guidance,

    // Searchable text blob built by buildProfileText() in LawyerOnboarding.jsx
    profile_text,
  } = req.body;

  if (!user_id || !lsk_registration_number) {
    return res.status(400).json({ error: "user_id and lsk_registration_number are required." });
  }

  const validationErrors = validateLawyerProfilePayload(req.body);
  if (Object.keys(validationErrors).length) {
    return res.status(400).json({ error: "Invalid profile data.", fieldErrors: validationErrors });
  }

  try {
    // A profile can only be created/edited for an account that is actually
    // registered as a Lawyer — stops a client account's user_id (forged or
    // otherwise) from ever writing a LawyerProfiles row. There's no session
    // layer anywhere in this app yet (flagged repo-wide, out of scope to
    // add here), so this cannot yet confirm the CALLER is that lawyer, only
    // that the target account is one — the same limitation the rest of the
    // app already has.
    const ownerCheck = await pool.query(
      `SELECT role FROM Users WHERE user_id = $1`,
      [user_id]
    );
    if (!ownerCheck.rows.length) {
      return res.status(404).json({ error: "No account found for this user_id." });
    }
    if (ownerCheck.rows[0].role !== 'Lawyer') {
      return res.status(403).json({ error: "Only a Lawyer account may create or edit a lawyer profile." });
    }

    // profile_embedding intentionally omitted — pgvector isn't installed,
    // and the current TF-IDF matching approach doesn't need it. Re-add if/when
    // the embeddings upgrade described in the project's future-work section
    // is implemented, along with the pgvector extension and column.
    const queryText = `
      INSERT INTO LawyerProfiles (
        user_id,
        lsk_registration_number,
        full_name,
        biography,
        academic_qualifications,
        institutions,
        graduation_year,
        bar_admission_year,
        courts,
        languages,
        specializations,
        years_of_experience,
        firm_name,
        case_type_descriptions,
        previous_cases_handled,
        success_rate,
        price_guidance,
        profile_text,
        county
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      ON CONFLICT (lsk_registration_number)
      DO UPDATE SET
        full_name               = EXCLUDED.full_name,
        biography               = EXCLUDED.biography,
        academic_qualifications = EXCLUDED.academic_qualifications,
        institutions            = EXCLUDED.institutions,
        graduation_year         = EXCLUDED.graduation_year,
        bar_admission_year      = EXCLUDED.bar_admission_year,
        courts                  = EXCLUDED.courts,
        languages               = EXCLUDED.languages,
        specializations         = EXCLUDED.specializations,
        years_of_experience     = EXCLUDED.years_of_experience,
        firm_name               = EXCLUDED.firm_name,
        case_type_descriptions  = EXCLUDED.case_type_descriptions,
        previous_cases_handled  = EXCLUDED.previous_cases_handled,
        success_rate            = EXCLUDED.success_rate,
        price_guidance          = EXCLUDED.price_guidance,
        profile_text            = EXCLUDED.profile_text,
        county                  = EXCLUDED.county
      RETURNING *;
    `;

    const values = [
      user_id,
      lsk_registration_number,
      full_name             ?? null,
      biography             ?? null,
      academic_qualifications ?? null,
      institutions          ?? null,
      graduation_year       ? Number(graduation_year)        : null,
      bar_admission_year    ? Number(bar_admission_year)     : null,
      courts                ?? null,
      languages             ?? null,
      specializations       ?? null,
      years_of_experience !== undefined && years_of_experience !== ""
        ? parseInt(years_of_experience)  : null,
      firm_name             ?? null,
      case_type_descriptions ?? null,
      previous_cases_handled !== undefined && previous_cases_handled !== ""
        ? parseInt(previous_cases_handled) : null,
      success_rate !== undefined && success_rate !== ""
        ? Number(success_rate) : null,
      price_guidance        ?? null,
      profile_text           ?? null,
      county                ?? null,
    ];

    const result = await pool.query(queryText, values);

    return res.status(200).json({
      message: "Lawyer profile saved successfully.",
      profile: result.rows[0],
    });
  } catch (err) {
    console.error("Error saving lawyer profile:", err.message);
    return res.status(500).json({ error: "Server error while saving profile." });
  }
});

export default router;