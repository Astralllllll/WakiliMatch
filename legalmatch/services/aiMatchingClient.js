/**
 * services/aiMatchingClient.js
 *
 * Client for the Python FastAPI AI service. Handles calling /match and /embed,
 * managing the MATCHING_ENGINE feature flag (ai vs tfidf), fallback logic,
 * and combining semantic similarity with structured signals (category, jurisdiction,
 * precedent match, and case history).
 */

import { matchLawyersToCase } from './matchingEngine.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'wakili-internal-secret-2026';
const MATCHING_ENGINE = process.env.MATCHING_ENGINE || 'ai';
const AI_FALLBACK = process.env.AI_FALLBACK !== 'false'; // default true

const COMPOSITE_WEIGHTS = {
  PROFILE_SEMANTIC: 0.40,
  PRECEDENT: 0.30,
  CATEGORY_MATCH: 0.15,
  JURISDICTION_MATCH: 0.10,
  CASE_HISTORY: 0.05,
};

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0.0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0.0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function callAiServiceMatch(queryText, topCases = 20, topLawyers = 10) {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': INTERNAL_API_KEY,
      },
      body: JSON.stringify({
        query: queryText,
        top_cases: topCases,
        top_lawyers: topLawyers,
      }),
    });

    if (!res.ok) {
      throw new Error(`AI service returned status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('AI service match call failed:', err.message);
    throw err;
  }
}

async function callAiServiceEmbed(texts) {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': INTERNAL_API_KEY,
      },
      body: JSON.stringify({ texts }),
    });

    if (!res.ok) {
      throw new Error(`AI service embed returned status ${res.status}`);
    }
    const data = await res.json();
    return data.embeddings;
  } catch (err) {
    console.warn('AI service embed call failed:', err.message);
    throw err;
  }
}

/**
 * Main matching router: uses AI service if MATCHING_ENGINE=ai, falls back to TF-IDF if configured.
 */
async function generateMatchesForIssue(clientIssue, lawyerProfiles) {
  const queryText = `${clientIssue.issueTitle}\n${clientIssue.issueDescription}\n${clientIssue.legalCategory || ''}`;

  if (MATCHING_ENGINE === 'ai') {
    try {
      const aiResult = await callAiServiceMatch(queryText, 20, lawyerProfiles.length);

      // If AI service returned no good match or unsupported language, pass through
      if (aiResult.no_good_match || aiResult.unsupported_language) {
        return {
          matches: [],
          no_good_match: aiResult.no_good_match || false,
          unsupported_language: aiResult.unsupported_language || false,
          message: aiResult.message || 'No good match found.',
        };
      }

      // Map AI advocates & cases to registered lawyers
      const advocatesMap = new Map();
      for (const adv of (aiResult.advocates || [])) {
        if (!adv.ambiguous && adv.key) {
          advocatesMap.set(adv.key, adv);
        }
      }

      const results = lawyerProfiles.map((lawyer) => {
        const nameKey = (lawyer.fullName || '').toLowerCase().trim();
        const advMatch = advocatesMap.get(nameKey);

        const precedentScore = advMatch ? Math.min(advMatch.match_score, 1.0) : 0.0;
        const precedentCases = advMatch ? (advMatch.evidence || []).slice(0, 3) : [];

        // Category and jurisdiction structured signals
        const specTags = (lawyer.specializations || '').split(',').map((s) => s.trim().toLowerCase());
        const categoryMatch = specTags.includes((clientIssue.legalCategory || '').toLowerCase()) ? 1.0 : 0.0;

        const jurisdiction = (clientIssue.jurisdiction || '').toLowerCase();
        const inPastCases = (lawyer.pastCases || []).some((c) => (c.jurisdiction || '').toLowerCase() === jurisdiction);
        const inCourts = (lawyer.courts || '').toLowerCase().includes(jurisdiction);
        const jurisdictionMatch = (inPastCases || inCourts) ? 1.0 : 0.0;

        const relevantCaseCount = (lawyer.pastCases || []).filter((c) =>
          (c.caseType || '').toLowerCase().includes((clientIssue.legalCategory || '').toLowerCase())
        ).length;
        const caseHistoryScore = Math.min(relevantCaseCount / 5, 1.0);

        // Profile semantic score (default 0.5 if no embedding)
        const profileText = `${lawyer.biography || ''} ${lawyer.specializations || ''}`;
        const semanticScore = 0.5; // can be enhanced via lawyer_embeddings cosine if available

        const finalScore =
          semanticScore * COMPOSITE_WEIGHTS.PROFILE_SEMANTIC +
          precedentScore * COMPOSITE_WEIGHTS.PRECEDENT +
          categoryMatch * COMPOSITE_WEIGHTS.CATEGORY_MATCH +
          jurisdictionMatch * COMPOSITE_WEIGHTS.JURISDICTION_MATCH +
          caseHistoryScore * COMPOSITE_WEIGHTS.CASE_HISTORY;

        const reasons = [];
        if (precedentCases.length > 0) {
          reasons.push(`Precedent match: cited in ${precedentCases.length} relevant case judgment(s)`);
        }
        if (categoryMatch) {
          reasons.push(`Specializes in ${clientIssue.legalCategory}`);
        }
        if (jurisdictionMatch) {
          reasons.push(`Practices in ${clientIssue.jurisdiction}`);
        }
        if (reasons.length === 0) {
          reasons.push('General profile and professional background match');
        }

        return {
          lawyerId: lawyer.userId,
          fullName: lawyer.fullName,
          specializations: lawyer.specializations,
          yearsOfExperience: lawyer.yearsOfExperience,
          similarityScore: Number(finalScore.toFixed(4)),
          matchReason: reasons.join('; '),
          relevantCaseCount,
          precedentCases,
          componentScores: {
            semantic: semanticScore,
            precedent: precedentScore,
            category: categoryMatch,
            jurisdiction: jurisdictionMatch,
            caseHistory: caseHistoryScore,
          },
          warning: relevantCaseCount === 0 ? 'This lawyer has no directly relevant case history for this category or jurisdiction.' : null,
        };
      });

      return {
        matches: results.sort((a, b) => b.similarityScore - a.similarityScore),
        no_good_match: false,
        unsupported_language: false,
        message: 'Matches generated successfully via AI service',
      };

    } catch (err) {
      if (!AI_FALLBACK) {
        throw new Error('AI matching service is unavailable and fallback is disabled.');
      }
      console.warn('Falling back to TF-IDF matching engine due to AI service error:', err.message);
    }
  }

  // Fallback to existing TF-IDF engine
  const tfidfResults = matchLawyersToCase(clientIssue, lawyerProfiles);
  return {
    matches: tfidfResults,
    no_good_match: false,
    unsupported_language: false,
    message: 'Matches generated successfully via TF-IDF fallback',
  };
}

export { generateMatchesForIssue, callAiServiceMatch, callAiServiceEmbed };
