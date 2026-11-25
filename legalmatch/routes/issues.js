import express from 'express';
import pool from '../db.js';
import { summarizeCase } from '../services/aiAssist.js';
import { resolveCounty } from '../services/countyValidator.js';

const router = express.Router();

// GET: Fetch all issues for a specific client with summarized lawyer status
router.get('/client/:clientId', async (req, res) => {
  const { clientId } = req.params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required.' });
  }

  if (!uuidRegex.test(clientId)) {
    return res.status(400).json({ error: 'clientId must be a valid UUID.' });
  }

  try {
    const queryText = `
      SELECT
        ci.issue_id,
        ci.issue_title,
        ci.issue_description,
        ci.legal_category,
        ci.jurisdiction,
        ci.urgency_level,
        ci.status AS issue_status,
        ci.created_at,
        COALESCE(summary.mapped_status, 'pending') AS match_status,
        summary.match_id,
        summary.lawyer_id,
        summary.lawyer_name,
        summary.review_created_at
      FROM ClientIssues ci
      LEFT JOIN LATERAL (
        SELECT
          m.match_id,
          m.lawyer_id,
          COALESCE(lp.full_name, lp.lsk_registration_number, 'Lawyer') AS lawyer_name,
          (
            SELECT MAX(r.created_at)
            FROM Reviews r
            WHERE r.match_id = m.match_id
          ) AS review_created_at,
          CASE
            WHEN LOWER(m.status) = 'completed' THEN 'completed'
            WHEN LOWER(m.status) = 'ongoing' THEN 'accepted'
            WHEN LOWER(m.status) IN ('requested', 'pending') THEN 'pending'
            WHEN LOWER(m.status) = 'declined' THEN 'rejected'
            ELSE LOWER(m.status)
          END AS mapped_status
        FROM Matches m
        LEFT JOIN LawyerProfiles lp ON lp.user_id = m.lawyer_id
        WHERE m.issue_id = ci.issue_id
        ORDER BY
          CASE
            WHEN LOWER(m.status) IN ('ongoing', 'completed') THEN 1
            WHEN LOWER(m.status) IN ('requested', 'pending') THEN 2
            WHEN LOWER(m.status) = 'declined' THEN 3
            ELSE 4
          END,
          COALESCE(m.updated_at, m.created_at) DESC
        LIMIT 1
      ) summary ON TRUE
      WHERE ci.client_id = $1
      ORDER BY ci.created_at DESC;
    `;

    const result = await pool.query(queryText, [clientId]);
    return res.json({ issues: result.rows });
  } catch (err) {
    console.error('Error fetching client issues:', err.message);
    return res.status(500).json({ error: 'Server error while fetching client issues.' });
  }
});

// POST: Submit a new free-text client legal issue
router.post('/', async (req, res) => {
  const {
    client_id,
    issue_title,
    issue_description,
    legal_category,
    jurisdiction,
    urgency_level,
    budget_range,
    budget_min,
    budget_max,
  } = req.body;

  // Basic validation to protect the database integrity
  if (!client_id || !issue_title || !issue_description) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  // Deliverable 4, bug 2: never let free text reach the jurisdiction
  // column. Both web and Android's own case forms already only offer a
  // picker over the real county list, so a legitimate submission always
  // resolves - this only rejects something malformed or sent directly
  // against the API.
  let resolvedJurisdiction = null;
  if (jurisdiction) {
    const resolution = resolveCounty(jurisdiction);
    if (resolution.status !== 'resolved') {
      return res.status(400).json({
        error: "jurisdiction must be a recognized Kenyan county.",
        field: "jurisdiction",
      });
    }
    resolvedJurisdiction = resolution.county;
  }

  try {
    // Stored once at creation so lawyers can see a summary pre-confirmation
    // without the full description (privacy gating, brief section B5).
    // Always "mock" today (no real LLM_PROVIDER key) - never claim AI.
    const { summary: aiSummary } = summarizeCase({ legal_category, issue_description, urgency_level });

    const queryText = `
      INSERT INTO ClientIssues (
        client_id,
        issue_title,
        issue_description,
        legal_category,
        jurisdiction,
        urgency_level,
        budget_range,
        budget_min,
        budget_max,
        ai_summary,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Open')
      RETURNING *;
    `;

    const values = [
      client_id,
      issue_title,
      issue_description,
      legal_category || null,
      resolvedJurisdiction,
      urgency_level || null,
      budget_range || null,
      budget_min !== undefined && budget_min !== null && budget_min !== "" ? Number(budget_min) : null,
      budget_max !== undefined && budget_max !== null && budget_max !== "" ? Number(budget_max) : null,
      aiSummary || null,
    ];
    const result = await pool.query(queryText, values);

    res.status(201).json({
      message: "Legal issue submitted successfully",
      issue: result.rows[0]
    });

  } catch (err) {
    console.error("Error submitting client issue:", err.message);
    res.status(500).json({ error: "Server error while submitting your issue" });
  }
});

export default router;