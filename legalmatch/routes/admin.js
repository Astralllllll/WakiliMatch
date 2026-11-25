import express from 'express';
import pool from '../db.js';
import { getAdminSessionUser } from '../services/adminAuth.js';

const router = express.Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Deliverable 4, bug 3: every route below used to have zero auth - anyone
// who knew the URL could call it. Every admin route now requires a valid,
// unexpired admin session token (X-Admin-Session), issued only by
// POST /api/auth/admin/login after the email+password+code check.
router.use(async (req, res, next) => {
  const token = req.get('X-Admin-Session');
  const admin = await getAdminSessionUser(token).catch(() => null);
  if (!admin) {
    return res.status(403).json({ error: 'Admin session required.' });
  }
  req.adminUserId = admin.userId;
  next();
});

router.get('/overview', async (_req, res) => {
  try {
    const [clientsResult, lawyersResult, casesResult] = await Promise.all([
      pool.query(
        `SELECT
           u.user_id,
           u.email,
           u.created_at,
           COUNT(ci.issue_id)::int AS total_cases
         FROM Users u
         LEFT JOIN ClientIssues ci ON ci.client_id = u.user_id
         WHERE u.role = 'Client'
         GROUP BY u.user_id, u.email, u.created_at
         ORDER BY u.created_at DESC`
      ),
      pool.query(
        `SELECT
           u.user_id,
           u.email,
           u.created_at,
           lp.full_name,
           lp.lsk_registration_number,
           lp.specializations,
           lp.is_verified
         FROM Users u
         LEFT JOIN LawyerProfiles lp ON lp.user_id = u.user_id
         WHERE u.role = 'Lawyer'
         ORDER BY u.created_at DESC`
      ),
      pool.query(
        `SELECT
           ci.issue_id,
           ci.issue_title,
           ci.issue_description,
           ci.legal_category,
           ci.jurisdiction,
           ci.urgency_level,
           ci.status AS issue_status,
           ci.created_at,
           c.user_id AS client_id,
           c.email AS client_email,
           chosen.lawyer_id,
           chosen.status AS match_status,
           chosen.updated_at AS match_updated_at,
           l.email AS lawyer_email,
           lp.full_name AS lawyer_name
         FROM ClientIssues ci
         LEFT JOIN Users c ON c.user_id = ci.client_id
         LEFT JOIN LATERAL (
           SELECT m.*
           FROM Matches m
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
         ) chosen ON TRUE
         LEFT JOIN Users l ON l.user_id = chosen.lawyer_id
         LEFT JOIN LawyerProfiles lp ON lp.user_id = chosen.lawyer_id
         ORDER BY ci.created_at DESC`
      ),
    ]);

    return res.json({
      clients: clientsResult.rows,
      lawyers: lawyersResult.rows,
      cases: casesResult.rows,
    });
  } catch (err) {
    console.error('Error fetching admin overview:', err.message);
    return res.status(500).json({ error: 'Server error while fetching admin overview.' });
  }
});

router.delete('/cases/:issueId', async (req, res) => {
  const { issueId } = req.params;

  if (!UUID_REGEX.test(issueId || '')) {
    return res.status(400).json({ error: 'issueId must be a valid UUID.' });
  }

  try {
    const result = await pool.query(
      `DELETE FROM ClientIssues WHERE issue_id = $1 RETURNING issue_id`,
      [issueId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Case not found.' });
    }

    return res.json({ message: 'Case deleted successfully.' });
  } catch (err) {
    console.error('Error deleting case:', err.message);
    return res.status(500).json({ error: 'Server error while deleting case.' });
  }
});

router.delete('/clients/:clientId', async (req, res) => {
  const { clientId } = req.params;

  if (!UUID_REGEX.test(clientId || '')) {
    return res.status(400).json({ error: 'clientId must be a valid UUID.' });
  }

  try {
    const result = await pool.query(
      `DELETE FROM Users WHERE user_id = $1 AND role = 'Client' RETURNING user_id`,
      [clientId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    return res.json({ message: 'Client deleted successfully.' });
  } catch (err) {
    console.error('Error deleting client:', err.message);
    return res.status(500).json({ error: 'Server error while deleting client.' });
  }
});

router.patch('/lawyers/:lawyerId/verify', async (req, res) => {
  const { lawyerId } = req.params;
  const { is_verified } = req.body || {};

  if (!UUID_REGEX.test(lawyerId || '')) {
    return res.status(400).json({ error: 'lawyerId must be a valid UUID.' });
  }

  if (typeof is_verified !== 'boolean') {
    return res.status(400).json({ error: 'is_verified must be a boolean.' });
  }

  try {
    const result = await pool.query(
      `UPDATE LawyerProfiles
       SET is_verified = $1
       WHERE user_id = $2
       RETURNING user_id, is_verified`,
      [is_verified, lawyerId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Lawyer profile not found.' });
    }

    return res.json({
      message: is_verified ? 'Lawyer verified.' : 'Lawyer verification revoked.',
      lawyer: result.rows[0],
    });
  } catch (err) {
    console.error('Error updating lawyer verification:', err.message);
    return res.status(500).json({ error: 'Server error while updating lawyer verification.' });
  }
});

router.delete('/lawyers/:lawyerId', async (req, res) => {
  const { lawyerId } = req.params;

  if (!UUID_REGEX.test(lawyerId || '')) {
    return res.status(400).json({ error: 'lawyerId must be a valid UUID.' });
  }

  try {
    const result = await pool.query(
      `DELETE FROM Users WHERE user_id = $1 AND role = 'Lawyer' RETURNING user_id`,
      [lawyerId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Lawyer not found.' });
    }

    return res.json({ message: 'Lawyer deleted successfully.' });
  } catch (err) {
    console.error('Error deleting lawyer:', err.message);
    return res.status(500).json({ error: 'Server error while deleting lawyer.' });
  }
});

export default router;
