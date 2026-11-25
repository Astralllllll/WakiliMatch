/**
 * services/assistantEngine.js
 *
 * The adaptive AI Assistant intake (Deliverable 4, section 5), replacing
 * the old fixed four-question script. Each turn:
 *   1. Extracts whatever facts the user's latest answer actually contains
 *      (county, date, KES amount, yes/no, presence words) into a shared
 *      case_facts object, regardless of which slot was literally asked -
 *      "I was fired in March 2024" fills `when` immediately, so the next
 *      turn never re-asks it.
 *   2. Re-runs the real matching engine on the accumulated text to
 *      (re-)detect the practice area as more detail arrives.
 *   3. Picks the single highest-priority MISSING, area-relevant slot and
 *      asks it, rotating between a slot's phrasings turn to turn, never
 *      repeating a question and never asking about a filled slot.
 *   4. Stops after 5 questions or once nothing relevant is missing, then
 *      hands back a draft - never gives legal advice or predicts outcomes
 *      (declines "will I win?"-style questions but keeps gathering facts).
 *
 * `LLM_PROVIDER=mock` (the only implementation today) drives this entirely
 * from the question banks below; a real provider is expected to send the
 * same conversation + case_facts to an LLM and parse back
 * {reply, facts_updated, missing_facts, ready_to_draft} - on any failure
 * (network, invalid JSON) it falls back to this same mock turn rather than
 * breaking the chat.
 */
import { callAiServiceMatch } from './aiMatchingClient.js';
import { resolveCounty } from './countyValidator.js';

export const LLM_PROVIDER = process.env.LLM_PROVIDER || 'mock';

export const CASE_FACT_SLOTS = [
  'what_happened', 'area', 'other_party', 'when', 'county',
  'outcome_wanted', 'documents_held', 'urgency_reason',
  'amount_involved', 'prior_steps_taken',
];

export const MAX_QUESTIONS = 5;
const MAX_ASKS_PER_SLOT = 2;

const AREAS = {
  EMPLOYMENT: 'Employment & Labour',
  PROPERTY: 'Land & Property',
  FAMILY: 'Family & Succession',
  CRIMINAL: 'Criminal',
  COMMERCIAL: 'Commercial & Contract',
  TAX: 'Tax',
  CONSTITUTIONAL: 'Constitutional & Administrative',
};
const GENERAL = 'General';

// ─── Question banks (brief section 5) ───────────────────────────────────
// Each entry: { slot, priority (asked lowest-first), phrasings }. A slot is
// only ever asked if it's still empty - there is no separate "askIf"
// predicate because "is this slot still missing" IS the ask-if condition
// the brief describes; nothing here is ever conditionally irrelevant once
// its area is selected.
const QUESTION_BANKS = {
  [AREAS.EMPLOYMENT]: [
    { slot: 'when', priority: 1, phrasings: ['When did this happen?', 'Roughly when did this take place?'] },
    { slot: 'prior_steps_taken', priority: 2, phrasings: ['Was any notice or severance given, if relevant to your situation?', 'Did your employer give you notice, or pay any severance?'] },
    { slot: 'documents_held', priority: 3, phrasings: ['Do you have a written contract or recent payslips for this job?', 'Do you have any payslips or an employment contract on hand?'] },
    { slot: 'outcome_wanted', priority: 4, phrasings: ['Are you hoping for your job back, or unpaid pay/compensation instead?', 'What outcome are you hoping for - reinstatement, or compensation?'] },
    { slot: 'county', priority: 5, phrasings: ['Which town or county is that in? For example Nairobi, Mombasa or Kiambu.'] },
  ],
  [AREAS.PROPERTY]: [
    { slot: 'other_party', priority: 1, phrasings: ['Do you own or rent this property, and who is the other party - a landlord, tenant or neighbour?', 'Are you the owner or the tenant here, and who is the dispute with?'] },
    { slot: 'documents_held', priority: 2, phrasings: ['Do you have a title deed or lease agreement for it?', 'Is there a lease or title deed covering this property?'] },
    { slot: 'prior_steps_taken', priority: 3, phrasings: ['Has the other party served you with any notice or court papers?', 'Have you received any notice or summons about this?'] },
    { slot: 'when', priority: 4, phrasings: ['When did this happen, or when did the dispute start?'] },
    { slot: 'county', priority: 5, phrasings: ['Which town or county is the property in?'] },
  ],
  [AREAS.FAMILY]: [
    { slot: 'other_party', priority: 1, phrasings: ['What is your relationship to the other party involved, and are there children involved?', 'Who is this dispute with, and are any children affected?'] },
    { slot: 'documents_held', priority: 2, phrasings: ['Is there a will in place?', 'Was a will left behind?'] },
    { slot: 'prior_steps_taken', priority: 3, phrasings: ['Has an administrator or executor already been appointed, if relevant?', 'Has anyone already been appointed to administer the estate?'] },
    { slot: 'urgency_reason', priority: 4, phrasings: ['Is this urgent - for example custody or maintenance that needs quick attention?', 'Does this involve an urgent custody or maintenance need?'] },
    { slot: 'county', priority: 5, phrasings: ['Which town or county is this in?'] },
  ],
  [AREAS.CRIMINAL]: [
    { slot: 'prior_steps_taken', priority: 1, phrasings: ['Has the person involved been arrested, or formally charged?', 'Were they arrested, or already charged with something?'] },
    { slot: 'other_party', priority: 2, phrasings: ['Which police station or court is handling this?', 'Do you know which station or court is involved?'] },
    { slot: 'when', priority: 3, phrasings: ['Is there a bail hearing date set, and if so, when?', 'Has a court date or bail hearing been scheduled?'] },
    { slot: 'outcome_wanted', priority: 4, phrasings: ['Do you already have a lawyer, or are you looking for one now?'] },
    { slot: 'county', priority: 5, phrasings: ['Which town or county is this in?'] },
  ],
  [AREAS.COMMERCIAL]: [
    { slot: 'documents_held', priority: 1, phrasings: ['Is there a written contract for this?', 'Was there a signed contract or agreement?'] },
    { slot: 'amount_involved', priority: 2, phrasings: ['Roughly how much money is involved?', 'What amount of money are we talking about?'] },
    { slot: 'prior_steps_taken', priority: 3, phrasings: ['Have you sent, or received, a demand letter about this?'] },
    { slot: 'when', priority: 4, phrasings: ['When did this happen?'] },
    { slot: 'county', priority: 5, phrasings: ['Which town or county is this in?'] },
  ],
  [AREAS.TAX]: [
    { slot: 'documents_held', priority: 1, phrasings: ['Do you have any assessment notice or correspondence from KRA?'] },
    { slot: 'amount_involved', priority: 2, phrasings: ['Roughly what amount is being disputed?'] },
    { slot: 'prior_steps_taken', priority: 3, phrasings: ['Have you already filed an objection or appeal?'] },
    { slot: 'county', priority: 4, phrasings: ['Which town or county is this in?'] },
  ],
  [AREAS.CONSTITUTIONAL]: [
    { slot: 'other_party', priority: 1, phrasings: ['Which government body or official is this against?'] },
    { slot: 'prior_steps_taken', priority: 2, phrasings: ['Have you already taken any steps, such as a complaint or demand letter?'] },
    { slot: 'urgency_reason', priority: 3, phrasings: ['Is there a deadline or hearing date coming up?'] },
    { slot: 'county', priority: 4, phrasings: ['Which town or county is this in?'] },
  ],
  [GENERAL]: [
    { slot: 'when', priority: 1, phrasings: ['When did this happen?'] },
    { slot: 'other_party', priority: 2, phrasings: ['Who is the other party involved?'] },
    { slot: 'outcome_wanted', priority: 3, phrasings: ['What outcome are you hoping for?'] },
    { slot: 'county', priority: 4, phrasings: ['Which town or county is this in?'] },
  ],
};

// ─── Extractors (no LLM) ─────────────────────────────────────────────────
const MONTHS = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
const RELATIVE_DATE_WORDS = ['today', 'yesterday', 'last week', 'last month', 'this morning', 'last year', 'this week'];

function extractWhen(text) {
  const lower = text.toLowerCase();
  const monthMatch = lower.match(new RegExp(`\\b(${MONTHS})\\b[a-z]*\\s*\\d{0,4},?\\s*\\d{0,4}`, 'i'));
  if (monthMatch) return monthMatch[0].trim();
  const yearMatch = lower.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) return yearMatch[0];
  for (const phrase of RELATIVE_DATE_WORDS) {
    if (lower.includes(phrase)) return phrase;
  }
  return null;
}

function extractAmount(text) {
  const match = text.match(/(?:kes|ksh\.?|shillings?)\s?([\d,]+(?:\.\d+)?)/i) || text.match(/\b([\d,]{4,})\s?(?:kes|ksh|shillings?|\/-)/i);
  return match ? match[0].trim() : null;
}

function extractPresence(text, keywords) {
  const lower = text.toLowerCase();
  const found = keywords.filter((k) => lower.includes(k));
  return found.length ? found.join(', ') : null;
}

const DOCUMENT_WORDS = ['contract', 'payslip', 'title deed', 'lease', 'will', 'charge sheet', 'assessment notice', 'agreement'];
const PRIOR_STEPS_WORDS = ['notice', 'served', 'arrested', 'charged', 'filed', 'appeal', 'demand letter', 'administrator', 'summons'];
const OUTCOME_WORDS = ['reinstatement', 'compensation', 'custody', 'maintenance', 'damages', 'refund', 'my job back'];
const OTHER_PARTY_WORDS = ['landlord', 'tenant', 'employer', 'neighbour', 'neighbor', 'spouse', 'sibling', 'police', 'kra', 'government', 'brother', 'sister'];
const URGENCY_WORDS = ['urgent', 'custody', 'deadline', 'hearing', 'eviction', 'arrest', 'detained'];

const OUTCOME_PREDICTION_PATTERNS = [/will i win/i, /what are my chances/i, /do i have a case/i, /am i going to win/i, /will i get/i];
const EMERGENCY_WORDS = ['arrest', 'arrested', 'detained', 'violence', 'evict', 'eviction', 'deadline tomorrow', 'hearing tomorrow'];

/** Runs every extractor against one answer, returning only the slots it
 * actually found something for - never overwrites an already-filled slot
 * (the caller merges additively). */
function extractFacts(text) {
  const found = {};
  const when = extractWhen(text);
  if (when) found.when = when;
  const amount = extractAmount(text);
  if (amount) found.amount_involved = amount;
  const docs = extractPresence(text, DOCUMENT_WORDS);
  if (docs) found.documents_held = docs;
  const steps = extractPresence(text, PRIOR_STEPS_WORDS);
  if (steps) found.prior_steps_taken = steps;
  const outcome = extractPresence(text, OUTCOME_WORDS);
  if (outcome) found.outcome_wanted = outcome;
  const otherParty = extractPresence(text, OTHER_PARTY_WORDS);
  if (otherParty) found.other_party = otherParty;
  const urgency = extractPresence(text, URGENCY_WORDS);
  if (urgency) found.urgency_reason = urgency;
  const county = resolveCounty(text);
  if (county.status === 'resolved') found.county = county.county;
  return found;
}

function mergeFactsAdditively(facts, found) {
  const next = { ...facts };
  for (const [slot, value] of Object.entries(found)) {
    if (!next[slot]) next[slot] = value;
  }
  return next;
}

function isOutcomePrediction(text) {
  return OUTCOME_PREDICTION_PATTERNS.some((re) => re.test(text));
}

function isEmergency(text) {
  const lower = text.toLowerCase();
  return EMERGENCY_WORDS.some((w) => lower.includes(w));
}

function missingSlotsFor(area, facts, askedSlots) {
  const bank = QUESTION_BANKS[area] || QUESTION_BANKS[GENERAL];
  return bank
    .filter((q) => !facts[q.slot] && (askedSlots[q.slot] || 0) < MAX_ASKS_PER_SLOT)
    .sort((a, b) => a.priority - b.priority);
}

function nextQuestionFor(area, facts, askedSlots) {
  const missing = missingSlotsFor(area, facts, askedSlots);
  if (!missing.length) return null;
  const entry = missing[0];
  const askCount = askedSlots[entry.slot] || 0;
  return { slot: entry.slot, prompt: entry.phrasings[askCount % entry.phrasings.length] };
}

function buildAcknowledgment(lastMessage) {
  const trimmed = (lastMessage || '').trim();
  if (!trimmed) return '';
  const short = trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed;
  return `Got it${short ? ` - "${short}"` : ''}. `;
}

async function detectArea(accumulatedText) {
  if (!accumulatedText || !accumulatedText.trim()) return { status: 'empty_query', area: null };
  try {
    const result = await callAiServiceMatch(accumulatedText, 5, 1);
    return { status: result.status || 'success', area: result.xai?.matched_area || null };
  } catch {
    return { status: 'error', area: null };
  }
}

/**
 * One turn of the mock (question-bank) adaptive assistant.
 *
 * @param {object} state - { facts, askedSlots, turnsAsked } from the
 *   previous turn (all empty/zero on the first call).
 * @param {string} userMessage - the client's latest chat message.
 */
export async function runAssistantTurnMock(state, userMessage) {
  const prevFacts = state?.facts || {};
  const askedSlots = { ...(state?.askedSlots || {}) };
  let turnsAsked = state?.turnsAsked || 0;
  const message = (userMessage || '').trim();

  // ── First message: this IS what_happened. Validate before accepting it -
  // a gibberish/empty first message gets one open follow-up, no area
  // guess, no slot filled (brief section 5, point 2).
  if (!prevFacts.what_happened) {
    const detection = await detectArea(message);
    if (['empty_query', 'invalid_input', 'unsupported_language'].includes(detection.status)) {
      return {
        reply: 'Could not you tell me a bit more about what happened?',
        facts: prevFacts,
        askedSlots,
        turnsAsked,
        readyToDraft: false,
      };
    }

    let facts = { ...prevFacts, what_happened: message };
    facts = mergeFactsAdditively(facts, extractFacts(message));
    if (detection.area) facts.area = detection.area;
    // The bank area locks in on first confident detection (see
    // continueTurn's comment) - on turn 1 there's nothing to lock yet.
    const bankArea = state?.bankArea || detection.area || null;

    return continueTurn(facts, askedSlots, turnsAsked, message, bankArea);
  }

  // ── Later messages: fill whatever the text reveals, plus the slot that
  // was literally last asked (so free-text answers never go unrecorded) -
  // EXCEPT `county`, which must only ever be filled by resolveCounty()
  // actually resolving it. Falling back to raw text here would silently
  // reintroduce bug 2 ("home" stored as the county) the moment a county
  // question gets an answer the extractor can't resolve.
  let facts = mergeFactsAdditively(prevFacts, extractFacts(message));
  if (state?.lastAskedSlot && state.lastAskedSlot !== 'county' && !facts[state.lastAskedSlot]) {
    facts[state.lastAskedSlot] = message;
  }

  const accumulatedText = [facts.what_happened, message].filter(Boolean).join('. ');
  const detection = await detectArea(accumulatedText);
  if (detection.area) facts.area = detection.area;
  const bankArea = state?.bankArea || detection.area || null;

  return continueTurn(facts, askedSlots, turnsAsked, message, bankArea);
}

/**
 * `bankArea` is the area used to pick WHICH question bank to draw from -
 * once set, it stays fixed for the rest of the conversation even if later
 * re-detection (facts.area) suggests a different area, so a mid-
 * conversation re-classification (the real engine isn't always confident
 * early on) can't make the question sequence jump between unrelated banks
 * turn to turn. facts.area itself keeps updating and is what the final
 * draft's matched area/category reflect - only question SELECTION is
 * stabilized, not the classification shown to the user.
 */
function continueTurn(facts, askedSlots, turnsAsked, lastMessage, bankArea) {
  const predictionDecline = isOutcomePrediction(lastMessage)
    ? "I can't predict how a case will turn out - only a lawyer reviewing the full details can assess that. "
    : '';
  const emergencyNote = isEmergency(lastMessage)
    ? 'That sounds urgent - please also seek urgent help from a lawyer or the relevant authorities directly. '
    : '';

  const area = bankArea || facts.area || GENERAL;
  const displayArea = facts.area || area; // the latest classification, for what the user sees
  const question = turnsAsked < MAX_QUESTIONS ? nextQuestionFor(area, facts, askedSlots) : null;

  if (!question) {
    return {
      reply: `${predictionDecline}${emergencyNote}Drafted your case as ${displayArea}${facts.county ? `, ${facts.county}` : ''}. Review before continuing?`,
      facts,
      askedSlots,
      turnsAsked,
      bankArea,
      readyToDraft: true,
    };
  }

  const nextAsked = { ...askedSlots, [question.slot]: (askedSlots[question.slot] || 0) + 1 };
  return {
    reply: `${predictionDecline}${emergencyNote}${buildAcknowledgment(lastMessage)}${question.prompt}`,
    facts,
    askedSlots: nextAsked,
    turnsAsked: turnsAsked + 1,
    bankArea,
    readyToDraft: false,
    lastAskedSlot: question.slot,
  };
}

/**
 * Builds the final editable draft fields from accumulated case_facts -
 * same shape/labelling rules as services/aiAssist.js's mock draft (title,
 * description, jurisdiction, urgency), reusing the exact same county
 * resolution so this never stores raw text either.
 */
export function buildDraftFromFacts(facts) {
  const whatHappened = facts.what_happened || '';
  const title = whatHappened.length > 60 ? `${whatHappened.slice(0, 57).trim()}…` : whatHappened;

  const descriptionParts = [whatHappened];
  if (facts.when) descriptionParts.push(`This happened around ${facts.when}.`);
  if (facts.other_party) descriptionParts.push(`Other party: ${facts.other_party}.`);
  if (facts.documents_held) descriptionParts.push(`Documents: ${facts.documents_held}.`);
  if (facts.prior_steps_taken) descriptionParts.push(`Steps taken so far: ${facts.prior_steps_taken}.`);
  if (facts.outcome_wanted) descriptionParts.push(`Desired outcome: ${facts.outcome_wanted}.`);
  if (facts.amount_involved) descriptionParts.push(`Amount involved: ${facts.amount_involved}.`);
  const description = descriptionParts.filter(Boolean).join(' ');

  const countyResolution = facts.county ? resolveCounty(facts.county) : { status: 'unresolved', county: null, candidates: [] };
  const urgency = facts.urgency_reason || isEmergency(whatHappened) ? 'high' : 'medium';

  return {
    title,
    description,
    jurisdiction: countyResolution.status === 'resolved' ? countyResolution.county : null,
    jurisdictionNeedsClarification: Boolean(facts.county) && countyResolution.status !== 'resolved',
    jurisdictionCandidates: countyResolution.candidates,
    urgency,
    matchedArea: facts.area || null,
    isAiGenerated: false,
  };
}

/**
 * Public entry point: tries the real provider first (not implemented -
 * there is no key - so this always falls through today), falling back to
 * the mock question-bank engine on any failure, per the brief's "LLM JSON
 * failure falls back without breaking the chat."
 */
export async function runAssistantTurn(state, userMessage) {
  if (LLM_PROVIDER !== 'mock') {
    try {
      throw new Error(`LLM_PROVIDER=${LLM_PROVIDER} has no implementation yet.`);
    } catch (err) {
      console.warn('Real assistant provider failed, falling back to mock turn:', err.message);
    }
  }
  return runAssistantTurnMock(state, userMessage);
}
