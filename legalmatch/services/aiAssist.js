/**
 * services/aiAssist.js
 *
 * Provider interface for the AI Assistant chat intake and lawyer-side case
 * summaries (brief section B6). LLM_PROVIDER selects the implementation;
 * only 'mock' exists today - no real key has been added, so any other
 * value still falls back to mock rather than failing. Wire a real client
 * in here (and only here) when one is added.
 *
 * Guardrails that apply to ANY provider, mock or real: never give legal
 * advice or predict outcomes, ask only clarifying questions during intake,
 * and always remind the user this is not legal advice. The mock provider
 * trivially satisfies this by only ever templating the user's own words
 * back - a real provider's prompt must enforce it explicitly.
 */

import { resolveCounty } from './countyValidator.js';

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'mock';

const URGENT_KEYWORDS = ['arrest', 'evict', 'urgent', 'immediately', 'today', 'deadline', 'custody', 'detained'];

function draftCaseFromAnswersMock(answers) {
  const whatHappened = (answers.whatHappened || '').trim();
  const when = (answers.when || '').trim();
  const notice = (answers.noticeOrSeverance || '').trim();
  const location = (answers.location || '').trim();

  const title = whatHappened
    ? (whatHappened.length > 60 ? `${whatHappened.slice(0, 57).trim()}…` : whatHappened)
    : '';

  const descriptionParts = [whatHappened];
  if (when) descriptionParts.push(`This happened around ${when}.`);
  if (notice) descriptionParts.push(`Regarding notice or severance: ${notice}.`);
  const description = descriptionParts.filter(Boolean).join(' ');

  const lower = whatHappened.toLowerCase();
  const urgency = URGENT_KEYWORDS.some((k) => lower.includes(k)) ? 'high' : 'medium';

  // Deliverable 4, bug 2: the raw answer to "where" used to be stored
  // verbatim as the county ("home" -> jurisdiction "home"). Every answer is
  // now resolved against the real county list + alias map first; an
  // unresolved or ambiguous answer never becomes the jurisdiction - the
  // caller (the chat UI) re-asks using jurisdictionCandidates/
  // jurisdictionNeedsClarification instead.
  const locationResolution = location ? resolveCounty(location) : { status: 'unresolved', county: null, candidates: [] };

  return {
    title,
    description,
    jurisdiction: locationResolution.status === 'resolved' ? locationResolution.county : null,
    jurisdictionNeedsClarification: location ? locationResolution.status !== 'resolved' : false,
    jurisdictionCandidates: locationResolution.candidates,
    urgency,
    isAiGenerated: false, // mock = templated from the user's own words, never generated
  };
}

function summarizeCaseMock(issue) {
  const category = issue.legal_category || 'General';
  const urgencyNote = issue.urgency_level ? `, ${issue.urgency_level} urgency` : '';
  const excerpt = (issue.issue_description || '').slice(0, 140).trim();
  const summary = `${category}${urgencyNote}. ${excerpt}${excerpt.length === 140 ? '…' : ''}`.trim();
  return { summary, isAiGenerated: false };
}

export function draftCaseFromAnswers(answers) {
  if (LLM_PROVIDER !== 'mock') {
    console.warn(`LLM_PROVIDER=${LLM_PROVIDER} has no implementation yet; using mock.`);
  }
  return draftCaseFromAnswersMock(answers || {});
}

export function summarizeCase(issue) {
  if (LLM_PROVIDER !== 'mock') {
    console.warn(`LLM_PROVIDER=${LLM_PROVIDER} has no implementation yet; using mock.`);
  }
  return summarizeCaseMock(issue || {});
}

export { LLM_PROVIDER };
