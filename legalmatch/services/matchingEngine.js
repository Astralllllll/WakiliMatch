/**
 * services/matchingEngine.js
 *
 * Core matching decision logic, built against the actual WakiliMatch schema:
 *   - LawyerProfiles: full_name, biography, specializations (comma-separated),
 *     years_of_experience, is_verified
 *   - PastCases: lawyer_id, case_type, jurisdiction, case_year, outcome_note
 *   - ClientIssues: issue_title, issue_description, legal_category, jurisdiction
 *
 * Kept separate from lib/tfidf.js so the underlying similarity algorithm
 * (currently TF-IDF) can be swapped for embeddings later without touching
 * scoring weights or reason-generation logic.
 */

import { scoreCandidates } from '../lib/tfidf.js';

const WEIGHTS = {
  TEXT_SIMILARITY: 0.5,
  CATEGORY_MATCH: 0.25,
  JURISDICTION_MATCH: 0.15,
  RELEVANT_CASE_HISTORY: 0.10,
};

function splitTags(commaSeparated) {
  if (!commaSeparated) return [];
  return commaSeparated.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

/** Builds the searchable text blob for a lawyer from profile + past case text. */
function buildLawyerProfileText(lawyer) {
  const specText = lawyer.specializations || '';
  const pastCasesText = (lawyer.pastCases || [])
    .map((c) => `${c.caseType} ${c.jurisdiction} ${c.outcomeNote || ''}`)
    .join(' ');
  return [lawyer.biography, specText, pastCasesText].filter(Boolean).join(' ');
}

function buildClientQueryText(clientIssue) {
  return [clientIssue.issueTitle, clientIssue.issueDescription, clientIssue.legalCategory]
    .filter(Boolean)
    .join(' ');
}

function countRelevantPastCases(lawyer, clientIssue) {
  if (!lawyer.pastCases || lawyer.pastCases.length === 0) return 0;
  const category = (clientIssue.legalCategory || '').toLowerCase();
  if (!category) return 0;

  // Only count cases whose type actually matches the client's category.
  // Jurisdiction overlap alone does NOT count as "similar experience" —
  // otherwise a family lawyer's Nairobi case would wrongly be described
  // as relevant to a corporate client just because of shared location.
  return lawyer.pastCases.filter((c) => (c.caseType || '').toLowerCase().includes(category)).length;
}

function hasJurisdictionMatch(lawyer, clientIssue) {
  const jurisdiction = (clientIssue.jurisdiction || '').toLowerCase();
  if (!jurisdiction) return false;

  const inPastCases = (lawyer.pastCases || []).some(
    (c) => (c.jurisdiction || '').toLowerCase() === jurisdiction
  );
  const inCourts = (lawyer.courts || '').toLowerCase().includes(jurisdiction);
  return inPastCases || inCourts;
}

function buildReason({ textScore, categoryMatch, jurisdictionMatch, relevantCaseCount, clientIssue }) {
  const reasons = [];

  if (relevantCaseCount > 0) {
    reasons.push(
      `Handled ${relevantCaseCount} similar ${clientIssue.legalCategory || 'case'} matter${
        relevantCaseCount > 1 ? 's' : ''
      }${clientIssue.jurisdiction ? ` in ${clientIssue.jurisdiction}` : ''}`
    );
  }
  if (categoryMatch) {
    reasons.push(`Specializes in ${clientIssue.legalCategory}`);
  }
  if (jurisdictionMatch) {
    reasons.push(`Practices in ${clientIssue.jurisdiction}`);
  }
  if (reasons.length === 0 && textScore > 0.1) {
    reasons.push('Profile description closely matches your case details');
  }
  if (reasons.length === 0) {
    reasons.push('No directly relevant experience found — general profile match only');
  }

  return reasons.join('; ');
}

/**
 * Ranks lawyers against a client issue.
 * @param {object} clientIssue - { issueTitle, issueDescription, legalCategory, jurisdiction }
 * @param {object[]} lawyerProfiles - [{ userId, fullName, biography, specializations,
 *                                       yearsOfExperience, courts, pastCases: [...] }]
 * @returns {object[]} ranked matches with score, reason, and warning flag
 */
function matchLawyersToCase(clientIssue, lawyerProfiles) {
  if (!lawyerProfiles || lawyerProfiles.length === 0) return [];

  const queryText = buildClientQueryText(clientIssue);
  const candidateTexts = lawyerProfiles.map(buildLawyerProfileText);
  const textScores = scoreCandidates(queryText, candidateTexts);

  const results = lawyerProfiles.map((lawyer, i) => {
    const textScore = textScores[i];
    const specTags = splitTags(lawyer.specializations);
    const categoryMatch = specTags.includes((clientIssue.legalCategory || '').toLowerCase());
    const jurisdictionMatch = hasJurisdictionMatch(lawyer, clientIssue);
    const relevantCaseCount = countRelevantPastCases(lawyer, clientIssue);

    const compositeScore =
      textScore * WEIGHTS.TEXT_SIMILARITY +
      (categoryMatch ? 1 : 0) * WEIGHTS.CATEGORY_MATCH +
      (jurisdictionMatch ? 1 : 0) * WEIGHTS.JURISDICTION_MATCH +
      Math.min(relevantCaseCount / 5, 1) * WEIGHTS.RELEVANT_CASE_HISTORY;

    // "Relevant experience" means documented case history, not a self-declared
    // specialization tag — a lawyer can list "Corporate" on their profile with
    // zero corporate cases actually handled. Warn based on real history only.
    const noRelevantExperience = relevantCaseCount === 0;

    return {
      lawyerId: lawyer.userId,
      fullName: lawyer.fullName,
      specializations: lawyer.specializations,
      yearsOfExperience: lawyer.yearsOfExperience,
      similarityScore: Number(compositeScore.toFixed(4)),
      matchReason: buildReason({ textScore, categoryMatch, jurisdictionMatch, relevantCaseCount, clientIssue }),
      relevantCaseCount,
      warning: noRelevantExperience
        ? 'This lawyer has no directly relevant case history for this category or jurisdiction.'
        : null,
    };
  });

  return results.sort((a, b) => b.similarityScore - a.similarityScore);
}

export { matchLawyersToCase, buildLawyerProfileText, buildClientQueryText, WEIGHTS }; 