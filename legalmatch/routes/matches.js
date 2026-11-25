import express from 'express';
import pool from '../db.js';
import { generateMatchesForIssue } from '../services/aiMatchingClient.js';

const router = express.Router();

// GET: Fetch all generated lawyer matches for a specific issue
router.get('/issue/:issueId', async (req, res) => {
  const { issueId } = req.params;

  if (!issueId) {
    return res.status(400).json({ error: 'issueId is required.' });
  }

  if ((issueId || "").length !== 36) {
    return res.status(400).json({ error: 'issueId must be a valid UUID.' });
  }

  try {
    const queryText = `
      SELECT
        m.match_id,
        m.issue_id,
        m.client_id,
        m.lawyer_id,
        CASE
          WHEN LOWER(m.status) = 'pending' THEN 'requested'
          ELSE LOWER(m.status)
        END AS status,
        m.similarity_score,
        m.created_at,
        m.updated_at,
        lp.full_name,
        lp.lsk_registration_number,
        lp.biography,
        lp.years_of_experience,
        lp.specializations,
        lp.academic_qualifications,
        lp.courts,
        lp.languages,
        lp.price_guidance,
        lp.average_rating,
        lp.total_reviews,
        lp.previous_cases_handled
      FROM Matches m
      LEFT JOIN LawyerProfiles lp ON lp.user_id = m.lawyer_id
      WHERE m.issue_id = $1
      ORDER BY m.similarity_score DESC NULLS LAST, COALESCE(m.updated_at, m.created_at) DESC;
    `;

    const result = await pool.query(queryText, [issueId]);
    return res.json({ matches: result.rows });
  } catch (err) {
    console.error('Error fetching issue matches:', err.message);
    return res.status(500).json({ error: 'Server error while fetching issue matches.' });
  }
});

// POST: Select or switch lawyer for an issue
router.post('/select', async (req, res) => {
  const { issue_id, lawyer_id } = req.body || {};

  if (!issue_id || !lawyer_id) {
    return res.status(400).json({ error: 'issue_id and lawyer_id are required.' });
  }

  if ((issue_id || "").length !== 36 || (lawyer_id || "").length !== 36) {
    return res.status(400).json({ error: 'issue_id and lawyer_id must be valid UUID values.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const exists = await client.query(
      `SELECT match_id FROM Matches WHERE issue_id = $1 AND lawyer_id = $2 LIMIT 1`,
      [issue_id, lawyer_id]
    );

    if (!exists.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Selected lawyer was not found for this issue.' });
    }

    await client.query(
      `UPDATE Matches
       SET status = 'declined', updated_at = CURRENT_TIMESTAMP
       WHERE issue_id = $1
         AND lawyer_id <> $2
         AND LOWER(status) IN ('pending', 'requested', 'ongoing')`,
      [issue_id, lawyer_id]
    );

    const selectedResult = await client.query(
      `UPDATE Matches
       SET status = 'requested', updated_at = CURRENT_TIMESTAMP
       WHERE issue_id = $1 AND lawyer_id = $2
       RETURNING *`,
      [issue_id, lawyer_id]
    );

    await client.query(
      `UPDATE ClientIssues SET status = 'Matched' WHERE issue_id = $1`,
      [issue_id]
    );

    await client.query('COMMIT');
    return res.json({ selected_match: selectedResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error selecting lawyer:', err.message);
    return res.status(500).json({ error: 'Server error while selecting lawyer.' });
  } finally {
    client.release();
  }
});

// POST: Lawyer decision on a case (accept/reject)
router.post('/decision', async (req, res) => {
  const { match_id, lawyer_id, decision } = req.body || {};

  if (!match_id || !lawyer_id || !decision) {
    return res.status(400).json({ error: 'match_id, lawyer_id and decision are required.' });
  }

  if ((match_id || "").length !== 36 || (lawyer_id || "").length !== 36) {
    return res.status(400).json({ error: 'match_id and lawyer_id must be valid UUID values.' });
  }

  const normalizedDecision = String(decision).toLowerCase();
  if (!['accept', 'reject'].includes(normalizedDecision)) {
    return res.status(400).json({ error: "decision must be either 'accept' or 'reject'." });
  }

  const nextMatchStatus = normalizedDecision === 'accept' ? 'ongoing' : 'declined';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT match_id, issue_id, status
       FROM Matches
       WHERE match_id = $1 AND lawyer_id = $2
       LIMIT 1`,
      [match_id, lawyer_id]
    );

    if (!existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Case not found for this lawyer.' });
    }

    const currentStatus = String(existing.rows[0].status || '').toLowerCase();
    if (currentStatus === 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Completed cases cannot be modified.' });
    }

    // Do not allow reversing a lawyer's decision once accepted/rejected.
    if (currentStatus === 'ongoing' && normalizedDecision === 'reject') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This case is already accepted and cannot be rejected.' });
    }

    if (currentStatus === 'declined' && normalizedDecision === 'accept') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This case is already rejected and cannot be accepted.' });
    }

    // Idempotent behavior for same decision repeated.
    if ((currentStatus === 'ongoing' && normalizedDecision === 'accept') || (currentStatus === 'declined' && normalizedDecision === 'reject')) {
      await client.query('ROLLBACK');
      return res.json({
        message: currentStatus === 'ongoing' ? 'Case is already accepted.' : 'Case is already rejected.',
        match: existing.rows[0],
      });
    }

    const updated = await client.query(
      `UPDATE Matches
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE match_id = $2
       RETURNING *`,
      [nextMatchStatus, match_id]
    );

    const issueId = existing.rows[0].issue_id;

    if (normalizedDecision === 'accept') {
      await client.query(
        `UPDATE ClientIssues
         SET status = 'Matched'
         WHERE issue_id = $1`,
        [issueId]
      );
    } else {
      const stillActive = await client.query(
        `SELECT 1
         FROM Matches
         WHERE issue_id = $1
           AND LOWER(status) IN ('pending', 'requested', 'ongoing', 'completed')
         LIMIT 1`,
        [issueId]
      );

      await client.query(
        `UPDATE ClientIssues
         SET status = $2
         WHERE issue_id = $1`,
        [issueId, stillActive.rows.length ? 'Matched' : 'Open']
      );
    }

    await client.query('COMMIT');
    return res.json({
      message: normalizedDecision === 'accept' ? 'Case accepted.' : 'Case rejected.',
      match: updated.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error updating case decision:', err.message);
    return res.status(500).json({ error: 'Server error while updating case decision.' });
  } finally {
    client.release();
  }
});

// POST: Client completes case and submits lawyer review
router.post('/review', async (req, res) => {
  const { match_id, client_id, rating, review_text } = req.body || {};
  const parsedRating = Number(rating);

  if (!match_id || !client_id) {
    return res.status(400).json({ error: 'match_id and client_id are required.' });
  }

  if ((match_id || "").length !== 36 || (client_id || "").length !== 36) {
    return res.status(400).json({ error: 'match_id and client_id must be valid UUID values.' });
  }

  if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
    return res.status(400).json({ error: 'rating must be an integer between 1 and 5.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const matchResult = await client.query(
      `SELECT match_id, issue_id, lawyer_id, status
       FROM Matches
       WHERE match_id = $1 AND client_id = $2
       LIMIT 1`,
      [match_id, client_id]
    );

    if (!matchResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Match not found for this client.' });
    }

    const matchRow = matchResult.rows[0];
    const currentStatus = String(matchRow.status || '').toLowerCase();
    if (!['ongoing', 'completed'].includes(currentStatus)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Only accepted/ongoing cases can be completed and reviewed.' });
    }

    const existingReview = await client.query(
      `SELECT review_id
       FROM Reviews
       WHERE match_id = $1 AND client_id = $2
       LIMIT 1`,
      [match_id, client_id]
    );

    let review;
    if (existingReview.rows.length) {
      const updatedReview = await client.query(
        `UPDATE Reviews
         SET rating = $1, review_text = $2
         WHERE review_id = $3
         RETURNING *`,
        [parsedRating, review_text || null, existingReview.rows[0].review_id]
      );
      review = updatedReview.rows[0];
    } else {
      const insertedReview = await client.query(
        `INSERT INTO Reviews (client_id, lawyer_id, match_id, rating, review_text)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [client_id, matchRow.lawyer_id, match_id, parsedRating, review_text || null]
      );
      review = insertedReview.rows[0];
    }

    // Recalculate and persist the lawyer's aggregate rating stats.
    // Recomputed from scratch (rather than an incremental running average)
    // so that edits to an existing review (the branch above) can't cause
    // double-counting or drift — cheap at this scale, and impossible to
    // get subtly wrong.
    await client.query(
      `UPDATE LawyerProfiles
       SET average_rating = (
             SELECT ROUND(AVG(rating)::numeric, 2)
             FROM Reviews
             WHERE lawyer_id = $1
           ),
           total_reviews = (
             SELECT COUNT(*)
             FROM Reviews
             WHERE lawyer_id = $1
           )
       WHERE user_id = $1`,
      [matchRow.lawyer_id]
    );

    await client.query(
      `UPDATE Matches
       SET status = 'completed', updated_at = CURRENT_TIMESTAMP
       WHERE match_id = $1`,
      [match_id]
    );

    await client.query(
      `UPDATE ClientIssues
       SET status = 'Closed'
       WHERE issue_id = $1`,
      [matchRow.issue_id]
    );

    await client.query('COMMIT');
    return res.json({ message: 'Review submitted and case marked complete.', review });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error submitting review:', err.message);
    return res.status(500).json({ error: 'Server error while submitting review.' });
  } finally {
    client.release();
  }
});

// GET: Fetch an existing client review for a specific match
router.get('/review/:matchId/:clientId', async (req, res) => {
  const { matchId, clientId } = req.params;

  if ((matchId || '').length !== 36 || (clientId || '').length !== 36) {
    return res.status(400).json({ error: 'matchId and clientId must be valid UUID values.' });
  }

  try {
    const result = await pool.query(
      `SELECT review_id, match_id, client_id, lawyer_id, rating, review_text, created_at
       FROM Reviews
       WHERE match_id = $1 AND client_id = $2
       LIMIT 1`,
      [matchId, clientId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Review not found.' });
    }

    return res.json({ review: result.rows[0] });
  } catch (err) {
    console.error('Error fetching review:', err.message);
    return res.status(500).json({ error: 'Server error while fetching review.' });
  }
});

// GET: Fetch a single case detail for lawyer view
router.get('/case/:matchId', async (req, res) => {
  const { matchId } = req.params;

  if (!matchId) {
    return res.status(400).json({ error: 'matchId is required.' });
  }

  if ((matchId || "").length !== 36) {
    return res.status(400).json({ error: 'matchId must be a valid UUID.' });
  }

  try {
    const queryText = `
      SELECT
        m.match_id,
        m.issue_id,
        m.client_id,
        m.lawyer_id,
        CASE
          WHEN LOWER(m.status) = 'pending' THEN 'requested'
          ELSE LOWER(m.status)
        END AS status,
        m.similarity_score,
        m.created_at,
        m.updated_at,
        -- Privacy gating (brief section B5): the lawyer sees only the
        -- category + AI summary until the client confirms this specific
        -- lawyer (status moves off 'pending'). Full details are withheld,
        -- not just hidden client-side, until then.
        (LOWER(m.status) <> 'pending') AS details_confirmed,
        ci.issue_title,
        ci.legal_category,
        ci.ai_summary,
        CASE WHEN LOWER(m.status) <> 'pending' THEN ci.issue_description ELSE NULL END AS issue_description,
        CASE WHEN LOWER(m.status) <> 'pending' THEN ci.jurisdiction ELSE NULL END AS jurisdiction,
        CASE WHEN LOWER(m.status) <> 'pending' THEN ci.urgency_level ELSE NULL END AS urgency_level,
        CASE WHEN LOWER(m.status) <> 'pending' THEN ci.budget_range ELSE NULL END AS budget_range,
        CASE WHEN LOWER(m.status) <> 'pending' THEN ci.budget_min ELSE NULL END AS budget_min,
        CASE WHEN LOWER(m.status) <> 'pending' THEN ci.budget_max ELSE NULL END AS budget_max,
        CASE WHEN LOWER(m.status) <> 'pending' THEN u.email ELSE NULL END AS client_email,
        CASE WHEN LOWER(m.status) <> 'pending' THEN
          COALESCE(
            NULLIF(TRIM(u.full_name), ''),
            TRIM(
              REGEXP_REPLACE(
                INITCAP(
                  REPLACE(
                    REPLACE(
                      SPLIT_PART(COALESCE(u.email, ''), '@', 1),
                      '.',
                      ' '
                    ),
                    '_',
                    ' '
                  )
                ),
                '\\s+',
                ' ',
                'g'
              )
            )
          )
        ELSE NULL END AS client_display_name
      FROM Matches m
      LEFT JOIN ClientIssues ci ON ci.issue_id = m.issue_id
      LEFT JOIN Users u ON u.user_id = m.client_id
      WHERE m.match_id = $1
      LIMIT 1;
    `;

    const result = await pool.query(queryText, [matchId]);
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Case not found.' });
    }

    return res.json({ case: result.rows[0] });
  } catch (err) {
    console.error('Error fetching case detail:', err.message);
    return res.status(500).json({ error: 'Server error while fetching case detail.' });
  }
});

// GET: Fetch matches for a lawyer dashboard
router.get('/lawyer/:lawyerId', async (req, res) => {
  const { lawyerId } = req.params;

  if (!lawyerId) {
    return res.status(400).json({ error: "lawyerId is required." });
  }

  if ((lawyerId || "").length !== 36) {
    return res.status(400).json({ error: "lawyerId must be a valid UUID." });
  }

  try {
    const queryText = `
      WITH ranked_matches AS (
        SELECT
          m.*,
          ROW_NUMBER() OVER (
            PARTITION BY m.issue_id
            ORDER BY
              CASE
                WHEN LOWER(m.status) IN ('pending', 'requested', 'ongoing', 'completed') THEN 1
                WHEN LOWER(m.status) = 'declined' THEN 2
                ELSE 3
              END,
              COALESCE(m.updated_at, m.created_at) DESC
          ) AS rn
        FROM Matches m
        WHERE m.lawyer_id = $1
          AND LOWER(m.status) IN ('pending', 'requested', 'ongoing', 'completed')
      )
      SELECT
        rm.match_id,
        CASE
          WHEN LOWER(rm.status) = 'pending' THEN 'requested'
          ELSE LOWER(rm.status)
        END AS status,
        rm.created_at,
        rm.updated_at,
        rm.similarity_score,
        -- Privacy gating (brief section B5): withheld server-side, not
        -- just hidden client-side, until the client confirms this lawyer.
        (LOWER(rm.status) <> 'pending') AS details_confirmed,
        ci.issue_title,
        ci.legal_category,
        ci.ai_summary,
        CASE WHEN LOWER(rm.status) <> 'pending' THEN ci.issue_description ELSE NULL END AS issue_description,
        CASE WHEN LOWER(rm.status) <> 'pending' THEN ci.jurisdiction ELSE NULL END AS jurisdiction,
        CASE WHEN LOWER(rm.status) <> 'pending' THEN ci.urgency_level ELSE NULL END AS urgency_level,
        CASE WHEN LOWER(rm.status) <> 'pending' THEN ci.budget_range ELSE NULL END AS budget_range,
        CASE WHEN LOWER(rm.status) <> 'pending' THEN ci.budget_min ELSE NULL END AS budget_min,
        CASE WHEN LOWER(rm.status) <> 'pending' THEN ci.budget_max ELSE NULL END AS budget_max,
        CASE WHEN LOWER(rm.status) <> 'pending' THEN ci.client_id ELSE NULL END AS client_id,
        CASE WHEN LOWER(rm.status) <> 'pending' THEN u.email ELSE NULL END AS client_email,
        CASE WHEN LOWER(rm.status) <> 'pending' THEN
          COALESCE(
            NULLIF(TRIM(u.full_name), ''),
            TRIM(
              REGEXP_REPLACE(
                INITCAP(
                  REPLACE(
                    REPLACE(
                      SPLIT_PART(COALESCE(u.email, ''), '@', 1),
                      '.',
                      ' '
                    ),
                    '_',
                    ' '
                  )
                ),
                '\\s+',
                ' ',
                'g'
              )
            )
          )
        ELSE NULL END AS client_display_name,
        AVG(r.rating)::numeric(3,2) AS rating,
        COUNT(r.review_id)::int AS review_count,
        MAX(r.review_text) AS review_comment,
        MAX(r.created_at) AS review_created_at
      FROM ranked_matches rm
      LEFT JOIN ClientIssues ci ON ci.issue_id = rm.issue_id
      LEFT JOIN Users u ON u.user_id = rm.client_id
      LEFT JOIN Reviews r ON r.match_id = rm.match_id
      WHERE rm.rn = 1
      GROUP BY
        rm.match_id,
        rm.status,
        rm.created_at,
        rm.updated_at,
        rm.similarity_score,
        ci.issue_title,
        ci.issue_description,
        ci.legal_category,
        ci.ai_summary,
        ci.jurisdiction,
        ci.urgency_level,
        ci.budget_range,
        ci.budget_min,
        ci.budget_max,
        ci.client_id,
        u.email,
        u.full_name
      ORDER BY COALESCE(rm.updated_at, rm.created_at) DESC;
    `;

    const result = await pool.query(queryText, [lawyerId]);

    return res.json({
      cases: result.rows,
    });
  } catch (err) {
    console.error("Error fetching lawyer matches:", err.message);
    return res.status(500).json({ error: "Server error while fetching lawyer cases." });
  }
});

// POST: Generate matches for a specific client issue
router.post('/generate', async (req, res) => {
  const { client_id, issue_id, issue_text } = req.body;

  if (!client_id || !issue_id || !issue_text) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    // 1. Fetch the client issue (need legal_category + jurisdiction for scoring,
    //    not just issue_text, since the frontend sends issue_text as a summary)
    const issueResult = await pool.query(
      `SELECT issue_id, issue_title, issue_description, legal_category, jurisdiction
       FROM ClientIssues WHERE issue_id = $1`,
      [issue_id]
    );

    if (!issueResult.rows.length) {
      return res.status(404).json({ error: 'Client issue not found.' });
    }

    const issueRow = issueResult.rows[0];
    const clientIssue = {
      issueTitle: issueRow.issue_title,
      issueDescription: issueRow.issue_description || issue_text,
      legalCategory: issueRow.legal_category,
      jurisdiction: issueRow.jurisdiction,
    };

    // 2. Fetch verified lawyers with their past cases (replaces the pgvector query)
    const lawyersResult = await pool.query(`
      SELECT
        lp.user_id,
        lp.full_name,
        lp.lsk_registration_number,
        lp.biography,
        lp.years_of_experience,
        lp.specializations,
        lp.academic_qualifications,
        lp.courts,
        lp.languages,
        lp.price_guidance,
        lp.average_rating,
        lp.total_reviews,
        lp.previous_cases_handled,
        COALESCE(
          json_agg(
            json_build_object(
              'caseType', pc.case_type,
              'jurisdiction', pc.jurisdiction,
              'year', pc.case_year,
              'outcomeNote', pc.outcome_note
            )
          ) FILTER (WHERE pc.case_id IS NOT NULL),
          '[]'
        ) AS past_cases
      FROM LawyerProfiles lp
      LEFT JOIN PastCases pc ON pc.lawyer_id = lp.user_id
      WHERE lp.is_verified = true
      GROUP BY lp.profile_id, lp.user_id
    `);

    if (lawyersResult.rows.length === 0) {
      return res.status(200).json({ message: 'No lawyers are currently available for matching.', matches: [] });
    }

    const lawyerProfiles = lawyersResult.rows.map((row) => ({
      userId: row.user_id,
      fullName: row.full_name,
      lskRegistrationNumber: row.lsk_registration_number,
      biography: row.biography,
      yearsOfExperience: row.years_of_experience,
      specializations: row.specializations,
      academicQualifications: row.academic_qualifications,
      courts: row.courts,
      languages: row.languages,
      priceGuidance: row.price_guidance,
      averageRating: row.average_rating,
      totalReviews: row.total_reviews,
      previousCasesHandled: row.previous_cases_handled,
      pastCases: row.past_cases || [],
    }));

    // 3. Run the AI / TF-IDF matching engine
    const aiOutput = await generateMatchesForIssue(clientIssue, lawyerProfiles);
    if (aiOutput.status && aiOutput.status !== 'success') {
      return res.status(200).json({
        message: aiOutput.message,
        matches: [],
        no_good_match: aiOutput.no_good_match,
        unsupported_language: aiOutput.unsupported_language,
        status: aiOutput.status,
        example_queries: aiOutput.example_queries || [],
        xai: aiOutput.xai || null,
      });
    }

    const ranked = aiOutput.matches;
    const topMatches = ranked.slice(0, 5); // keep top 5

    if (topMatches.length === 0) {
      return res.status(200).json({ message: 'No suitable lawyers found.', matches: [] });
    }

    // 4. Save matches into the Matches table (same insert pattern as before,
    //    now including match_reason)
    const savedMatches = [];
    for (const match of topMatches) {
      const insertMatchQuery = `
        INSERT INTO Matches (client_id, lawyer_id, issue_id, similarity_score, match_reason, status)
        VALUES ($1, $2, $3, $4, $5, 'Pending')
        RETURNING *;
      `;
      const values = [client_id, match.lawyerId, issue_id, match.similarityScore, match.matchReason];
      const result = await pool.query(insertMatchQuery, values);

      savedMatches.push({
        ...result.rows[0],
        full_name: match.fullName,
        specializations: match.specializations,
        years_of_experience: match.yearsOfExperience,
        previous_cases_handled: match.previousCasesHandled ?? null,
        match_reason: match.matchReason,
        warning: match.warning,
        why: match.why || null,
        component_scores: match.componentScores || null,
      });
    }

    // 5. Return to frontend
    return res.status(200).json({
      message: 'Matches generated successfully',
      matches: savedMatches,
      status: 'success',
      xai: aiOutput.xai || null,
    });
  } catch (err) {
    console.error('Error generating matches:', err.message);
    return res.status(500).json({ error: 'Server error while generating matches' });
  }
});

export default router;