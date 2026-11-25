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

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'mock';

function summarizeCaseMock(issue) {
  const category = issue.legal_category || 'General';
  const urgencyNote = issue.urgency_level ? `, ${issue.urgency_level} urgency` : '';
  const excerpt = (issue.issue_description || '').slice(0, 140).trim();
  const summary = `${category}${urgencyNote}. ${excerpt}${excerpt.length === 140 ? '…' : ''}`.trim();
  return { summary, isAiGenerated: false };
}

export function summarizeCase(issue) {
  if (LLM_PROVIDER !== 'mock') {
    console.warn(`LLM_PROVIDER=${LLM_PROVIDER} has no implementation yet; using mock.`);
  }
  return summarizeCaseMock(issue || {});
}

export { LLM_PROVIDER };
