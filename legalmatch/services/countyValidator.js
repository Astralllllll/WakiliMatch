/**
 * services/countyValidator.js
 *
 * Shared county/jurisdiction validator (Deliverable 4, bug 2). Pure JS, no
 * Node-only APIs, so both the Express backend (routes/issues.js,
 * routes/profiles.js, services/aiAssist.js) and the web frontend
 * (src/context/CaseContext.jsx, the AI Assistant chat) import this exact
 * same file - one data source, not three copies that can drift apart.
 * (The Android app can't import a JS file; its county list/alias map in
 * app/.../data/CaseOptions.kt and its own resolver must be kept in sync by
 * hand against this file.)
 *
 * Root cause this fixes: the AI assistant's location answer used to be
 * stored verbatim with no validation at all - type "home" and "home"
 * became the case's county. ALL 47 of Kenya's counties, a common-town-to-
 * county alias map, and a small Levenshtein fuzzy-match pass replace that.
 */

export const KENYAN_COUNTIES = [
  "Nairobi", "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu",
  "Taita-Taveta", "Garissa", "Wajir", "Mandera", "Marsabit", "Isiolo",
  "Meru", "Tharaka-Nithi", "Embu", "Kitui", "Machakos", "Makueni",
  "Nyandarua", "Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Turkana",
  "West Pokot", "Samburu", "Trans Nzoia", "Uasin Gishu", "Elgeyo-Marakwet",
  "Nandi", "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado", "Kericho",
  "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya", "Kisumu",
  "Homa Bay", "Migori", "Kisii", "Nyamira",
];

// Common towns/estates/sub-locations mapped to their actual county - easy
// to extend: add a lowercase key -> canonical county name (from
// KENYAN_COUNTIES) below. Keys are matched case-insensitively.
export const COUNTY_ALIASES = {
  // Nairobi
  westlands: "Nairobi", kilimani: "Nairobi", embakasi: "Nairobi", karen: "Nairobi",
  // Kiambu
  ruiru: "Kiambu", thika: "Kiambu", juja: "Kiambu", kikuyu: "Kiambu", limuru: "Kiambu",
  // Kajiado
  kitengela: "Kajiado", ngong: "Kajiado", rongai: "Kajiado",
  // Machakos
  "athi river": "Machakos", syokimau: "Machakos", mavoko: "Machakos",
  // Uasin Gishu
  eldoret: "Uasin Gishu",
  // Mombasa
  nyali: "Mombasa", likoni: "Mombasa",
  // A few more common ones
  naivasha: "Nakuru", kitale: "Trans Nzoia", nanyuki: "Laikipia", malindi: "Kilifi",
};

const SUFFIX_WORDS = ["county", "town", "city"];

function normalize(text) {
  let t = (text || "").toLowerCase().trim();
  for (const suffix of SUFFIX_WORDS) {
    t = t.replace(new RegExp(`\\b${suffix}\\b`, "g"), "").trim();
  }
  return t.replace(/\s+/g, " ").trim();
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const rows = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) rows[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
    }
  }
  return rows[m][n];
}

// All canonical names + alias keys, each tagged with the county it resolves
// to, lowercased once up front for matching.
const LOOKUP = [
  ...KENYAN_COUNTIES.map((c) => ({ key: c.toLowerCase(), county: c })),
  ...Object.entries(COUNTY_ALIASES).map(([key, county]) => ({ key, county })),
];

/** Direct/alias word-boundary matches found anywhere in the raw text -
 * used both to resolve a clean answer and to detect two places named in
 * one sentence ("I live in Kiambu but the job was in Nairobi"). */
function findDirectMatches(rawText) {
  const lower = (rawText || "").toLowerCase();
  const found = new Set();
  for (const { key, county } of LOOKUP) {
    const re = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (re.test(lower)) found.add(county);
  }
  return [...found];
}

/** Fuzzy match ONLY against the normalized whole answer (not substrings of
 * a longer sentence - too unreliable), for typos like "Nairobbi". */
function findFuzzyMatch(normalizedText) {
  if (!normalizedText || normalizedText.length < 3) return null;
  let best = null;
  let bestDistance = Infinity;
  for (const { key, county } of LOOKUP) {
    const distance = levenshtein(normalizedText, key);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = county;
    }
  }
  // Allow more edits for longer names, but keep it tight enough that
  // unrelated words never match.
  const threshold = Math.max(1, Math.floor(normalizedText.length * 0.25));
  return bestDistance <= threshold ? best : null;
}

/**
 * Resolves free text (an assistant answer, a manual form field, anything)
 * to a county. Never returns raw, unvalidated text.
 *
 * @returns {{status: 'resolved'|'ambiguous'|'unresolved', county: string|null, candidates: string[]}}
 */
export function resolveCounty(text) {
  const normalized = normalize(text);
  if (!normalized) {
    return { status: "unresolved", county: null, candidates: [] };
  }

  const directMatches = findDirectMatches(text);
  if (directMatches.length > 1) {
    return { status: "ambiguous", county: null, candidates: directMatches };
  }
  if (directMatches.length === 1) {
    return { status: "resolved", county: directMatches[0], candidates: [] };
  }

  const fuzzy = findFuzzyMatch(normalized);
  if (fuzzy) {
    return { status: "resolved", county: fuzzy, candidates: [] };
  }

  return { status: "unresolved", county: null, candidates: [] };
}
