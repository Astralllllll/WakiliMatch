/**
 * lib/tfidf.js
 *
 * Minimal, dependency-free TF-IDF + cosine similarity implementation.
 * Kept isolated from the matching engine so the algorithm itself is
 * swappable later (e.g. for embedding-based semantic search) without
 * touching the route or matching-decision logic.
 */

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'this', 'that', 'these', 'those', 'it', 'as', 'from', 'has', 'have',
  'had', 'will', 'would', 'can', 'could', 'i', 'we', 'you', 'they',
]);

export function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((tok) => tok.length > 1 && !STOPWORDS.has(tok));
}

function termFrequency(tokens) {
  const tf = {};
  tokens.forEach((tok) => {
    tf[tok] = (tf[tok] || 0) + 1;
  });
  const total = tokens.length || 1;
  Object.keys(tf).forEach((k) => (tf[k] = tf[k] / total));
  return tf;
}

export function inverseDocumentFrequency(tokenizedDocs) {
  const df = {};
  tokenizedDocs.forEach((tokens) => {
    const seen = new Set(tokens);
    seen.forEach((tok) => {
      df[tok] = (df[tok] || 0) + 1;
    });
  });

  const idf = {};
  const N = tokenizedDocs.length || 1;
  Object.keys(df).forEach((term) => {
    idf[term] = Math.log(N / (1 + df[term])) + 1; // +1 smoothing
  });
  return idf;
}

function tfidfVector(tokens, idf) {
  const tf = termFrequency(tokens);
  const vector = {};
  Object.keys(tf).forEach((term) => {
    if (idf[term] !== undefined) {
      vector[term] = tf[term] * idf[term];
    }
  });
  return vector;
}

export function cosineSimilarity(vecA, vecB) {
  const termsA = Object.keys(vecA);
  const termsB = new Set(Object.keys(vecB));

  let dot = 0;
  termsA.forEach((term) => {
    if (termsB.has(term)) {
      dot += vecA[term] * vecB[term];
    }
  });

  const magA = Math.sqrt(Object.values(vecA).reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(Object.values(vecB).reduce((s, v) => s + v * v, 0));

  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/**
 * Given one query text and many candidate document texts, returns
 * similarity scores (0-1) in the same order as the candidates array.
 */
export function scoreCandidates(queryText, candidateTexts) {
  const allTokenized = [tokenize(queryText), ...candidateTexts.map(tokenize)];
  const idf = inverseDocumentFrequency(allTokenized);

  const queryVector = tfidfVector(allTokenized[0], idf);
  const candidateVectors = allTokenized.slice(1).map((toks) => tfidfVector(toks, idf));

  return candidateVectors.map((vec) => cosineSimilarity(queryVector, vec));
}
