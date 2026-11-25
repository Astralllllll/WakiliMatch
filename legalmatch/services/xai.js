/**
 * services/xai.js
 *
 * Per-lawyer "why" explanation builder (brief section A3) - templated text
 * only, no LLM. Mirrors ai-service/engine/xai.py's build_why() wording so
 * both sides read the same way; kept here instead of calling back into the
 * Python service because Express already has every number it needs.
 */

function buildWhy({ semanticPct, precedentCases, components, lawyerName }) {
  const sentences = [];
  if (semanticPct !== null && semanticPct !== undefined) {
    sentences.push(`${lawyerName}'s profile is a ${Math.round(semanticPct)}% semantic match to your description`);
  }
  if (precedentCases && precedentCases.length > 0) {
    const plural = precedentCases.length === 1 ? 'judgment' : 'judgments';
    sentences.push(`${lawyerName} appeared in ${precedentCases.length} similar ${plural}`);
  }

  let plainText;
  if (sentences.length === 2) {
    plainText = `${sentences[0]}, and ${sentences[1]}.`;
  } else if (sentences.length === 1) {
    plainText = `${sentences[0]}.`;
  } else {
    plainText = `${lawyerName} matches on category and jurisdiction, with no linked case precedent yet.`;
  }

  return {
    semantic_pct: semanticPct ?? null,
    precedent_cases: precedentCases || [],
    components,
    plain_text: plainText,
  };
}

/**
 * Minimal, honest xai block for the TF-IDF fallback path (no embeddings or
 * precedents exist on that path, so every AI-specific field must be null
 * rather than fabricated - brief's "never fabricate a number" rule).
 */
function fallbackXai() {
  return {
    matched_area: null,
    precedent_count: 0,
    threshold: null,
    top_precedent: null,
    explanation: 'Matched using keyword similarity - the AI semantic matching service was unavailable for this request.',
  };
}

export { buildWhy, fallbackXai };
