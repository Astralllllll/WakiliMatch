import express from 'express';
import pool from '../db.js';

const router = express.Router();

const CURRENT_YEAR = new Date().getFullYear();
const MAX_CASE_TYPE_LENGTH = 100;

// POST: Lawyer adds a past case to their profile
router.post('/:lawyerId/past-cases', async (req, res) => {
  const { lawyerId } = req.params;
  const { case_type, jurisdiction, case_year, outcome_note } = req.body || {};

  if ((lawyerId || '').length !== 36) {
    return res.status(400).json({ error: 'lawyerId must be a valid UUID.' });
  }

  if (!case_type || !jurisdiction || !case_year || !outcome_note) {
    return res.status(400).json({
      error: 'case_type, jurisdiction, case_year, and outcome_note are all required.',
    });
  }

  const normalizedCaseType = String(case_type).trim();
  if (!normalizedCaseType || normalizedCaseType.length > MAX_CASE_TYPE_LENGTH) {
    return res.status(400).json({
      error: `case_type must be between 1 and ${MAX_CASE_TYPE_LENGTH} characters.`,
    });
  }

  const parsedYear = Number(case_year);
  if (!Number.isInteger(parsedYear) || parsedYear < 1950 || parsedYear > CURRENT_YEAR) {
    return res.status(400).json({ error: `case_year must be a whole number between 1950 and ${CURRENT_YEAR}.` });
  }

  if (String(outcome_note).trim().length < 5) {
    return res.status(400).json({ error: 'outcome_note must be at least 5 characters.' });
  }

  try {
    // Confirm this user exists and is actually a lawyer before attaching case history
    const lawyerCheck = await pool.query(
      `SELECT user_id FROM Users WHERE user_id = $1 AND role = 'Lawyer'`,
      [lawyerId]
    );

    if (!lawyerCheck.rows.length) {
      return res.status(404).json({ error: 'Lawyer not found.' });
    }

    const insertResult = await pool.query(
      `INSERT INTO PastCases (lawyer_id, case_type, jurisdiction, case_year, outcome_note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [lawyerId, normalizedCaseType, String(jurisdiction).trim(), parsedYear, String(outcome_note).trim()]
    );

    return res.status(201).json({
      message: 'Past case added successfully.',
      pastCase: insertResult.rows[0],
    });
  } catch (err) {
    console.error('Error adding past case:', err.message);
    return res.status(500).json({ error: 'Server error while adding past case.' });
  }
});

// PATCH: Update an existing past case (e.g. lawyer edits an entry during onboarding review)
router.patch('/:lawyerId/past-cases/:caseId', async (req, res) => {
  const { lawyerId, caseId } = req.params;
  const { case_type, jurisdiction, case_year, outcome_note } = req.body || {};

  if ((lawyerId || '').length !== 36 || (caseId || '').length !== 36) {
    return res.status(400).json({ error: 'lawyerId and caseId must be valid UUIDs.' });
  }

  if (!case_type || !jurisdiction || !case_year || !outcome_note) {
    return res.status(400).json({
      error: 'case_type, jurisdiction, case_year, and outcome_note are all required.',
    });
  }

  const normalizedCaseType = String(case_type).trim();
  if (!normalizedCaseType || normalizedCaseType.length > MAX_CASE_TYPE_LENGTH) {
    return res.status(400).json({
      error: `case_type must be between 1 and ${MAX_CASE_TYPE_LENGTH} characters.`,
    });
  }

  const parsedYear = Number(case_year);
  if (!Number.isInteger(parsedYear) || parsedYear < 1950 || parsedYear > CURRENT_YEAR) {
    return res.status(400).json({ error: `case_year must be a whole number between 1950 and ${CURRENT_YEAR}.` });
  }

  if (String(outcome_note).trim().length < 5) {
    return res.status(400).json({ error: 'outcome_note must be at least 5 characters.' });
  }

  try {
    const updateResult = await pool.query(
      `UPDATE PastCases
       SET case_type = $1, jurisdiction = $2, case_year = $3, outcome_note = $4
       WHERE case_id = $5 AND lawyer_id = $6
       RETURNING *`,
      [normalizedCaseType, String(jurisdiction).trim(), parsedYear, String(outcome_note).trim(), caseId, lawyerId]
    );

    if (!updateResult.rows.length) {
      return res.status(404).json({ error: 'Past case not found for this lawyer.' });
    }

    return res.json({
      message: 'Past case updated successfully.',
      pastCase: updateResult.rows[0],
    });
  } catch (err) {
    console.error('Error updating past case:', err.message);
    return res.status(500).json({ error: 'Server error while updating past case.' });
  }
});

// GET: List a lawyer's past cases (used by their own profile edit view)
router.get('/:lawyerId/past-cases', async (req, res) => {
  const { lawyerId } = req.params;

  if ((lawyerId || '').length !== 36) {
    return res.status(400).json({ error: 'lawyerId must be a valid UUID.' });
  }

  try {
    const result = await pool.query(
      `SELECT case_id, case_type, jurisdiction, case_year, outcome_note, created_at
       FROM PastCases
       WHERE lawyer_id = $1
       ORDER BY case_year DESC, created_at DESC`,
      [lawyerId]
    );

    return res.json({ pastCases: result.rows });
  } catch (err) {
    console.error('Error fetching past cases:', err.message);
    return res.status(500).json({ error: 'Server error while fetching past cases.' });
  }
});

// DELETE: Remove a past case (e.g. lawyer corrects a mistaken entry)
router.delete('/:lawyerId/past-cases/:caseId', async (req, res) => {
  const { lawyerId, caseId } = req.params;

  if ((lawyerId || '').length !== 36 || (caseId || '').length !== 36) {
    return res.status(400).json({ error: 'lawyerId and caseId must be valid UUIDs.' });
  }

  try {
    const result = await pool.query(
      `DELETE FROM PastCases WHERE case_id = $1 AND lawyer_id = $2 RETURNING case_id`,
      [caseId, lawyerId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Past case not found for this lawyer.' });
    }

    return res.json({ message: 'Past case removed.', case_id: result.rows[0].case_id });
  } catch (err) {
    console.error('Error deleting past case:', err.message);
    return res.status(500).json({ error: 'Server error while deleting past case.' });
  }
});

export default router;
