"""Advocate-name cleanup, run AFTER extract_advocates() (brief section A5).

Kept as its own module so the notebook-ported extraction logic in
extractor.py is never touched - this only cleans its output. Three
independent problems, each its own function so they can be reasoned about
and tested separately:

  1. strip_trailing_fragments - drops party-clause bleed-through the
     extractor's regexes occasionally over-capture, e.g. "... Adv For The".
  2. fix_casing                - repairs mangled casing like "KiRUKI", while
     leaving genuine short abbreviations (SC, LLP, QC) and apostrophe'd/
     hyphenated surnames alone.
  3. cluster_firms             - collapses near-duplicate firm names (e.g.
     "Kihoro Kimani Adv" and "Kihoro Kimani & Associates Advocates") into one
     canonical entry by token-set (Jaccard) similarity over their
     significant words, keeping every raw variant as evidence rather than
     discarding it.

Surname-only personal names are flagged ambiguous=True here (never
auto-linked to a registered lawyer by name alone) using
extractor.is_surname_only, which existed but was never wired into the
pipeline before this change.

clean_advocates() cleans one flat list of extractor-shaped dicts.
clean_advocates_by_doc() applies it GLOBALLY across an entire
{doc_id: [advocate, ...]} corpus (as stored in engine_meta.json's
advocates_by_doc) so that firm-name variants appearing in *different*
documents still collapse to one key - the within-a-single-document case is
rare since a firm is usually named consistently within one judgment.
"""

import re

from engine.extractor import is_surname_only, normalise_key

_TRAILING_FRAGMENT_PATTERNS = [
    re.compile(r"\s+Adv(?:ocate)?s?\s+[Ff]or\s+[Tt]he\b.*$"),
    re.compile(r"\s+[Ff]or\s+[Tt]he\b.*$"),
    re.compile(r"\s+(?:[Vv]erses|[Vv]ersus|[Vv]s\.?)\b.*$"),
]

_FIRM_STOPWORDS = {"co", "company", "associates", "partners", "llp", "advocates", "advocate", "and", "the", "adv"}

_FIRM_SIMILARITY_THRESHOLD = 0.6


def strip_trailing_fragments(name: str) -> str:
    """Removes party-clause bleed-through, e.g. 'Kihoro Kimani Adv For The'
    -> 'Kihoro Kimani'. Applied repeatedly since a name can carry more than
    one fragment stacked up."""
    cleaned = name
    changed = True
    while changed:
        changed = False
        for pat in _TRAILING_FRAGMENT_PATTERNS:
            new = pat.sub("", cleaned).strip()
            if new != cleaned:
                cleaned = new
                changed = True
    return cleaned


def _fix_token_casing(token: str) -> str:
    if len(token) <= 3 and token.isupper():
        return token  # SC, LLP, QC, bare initials
    if re.fullmatch(r"[A-Z][a-z'\-]*", token):
        return token  # already fine, incl. "O'Brien", "Otieno-Kamau"
    segments = re.split(r"([\-'])", token)
    return "".join(seg if seg in ("-", "'") else seg.capitalize() for seg in segments)


def fix_casing(name: str) -> str:
    """Fixes mangled casing like 'KiRUKI' -> 'Kiruki', token by token."""
    return " ".join(_fix_token_casing(t) for t in name.split())


def _significant_tokens(name: str) -> set:
    return {t.lower() for t in re.findall(r"[A-Za-z']+", name) if t.lower() not in _FIRM_STOPWORDS}


def _jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def cluster_firms(firm_entries: list[dict]) -> list[dict]:
    """Collapses near-duplicate firm names by token-set similarity. Each
    output entry keeps the longest raw name as its display name and every
    raw variant that fed into it under 'evidence_names'."""
    clusters: list[dict] = []  # {"tokens": set, "names": [...], "entry": representative dict}

    for entry in firm_entries:
        tokens = _significant_tokens(entry["name"])
        for cluster in clusters:
            if _jaccard(tokens, cluster["tokens"]) >= _FIRM_SIMILARITY_THRESHOLD:
                cluster["tokens"] |= tokens
                cluster["names"].append(entry["name"])
                if len(entry["name"]) > len(cluster["entry"]["name"]):
                    cluster["entry"] = entry
                break
        else:
            clusters.append({"tokens": tokens, "names": [entry["name"]], "entry": entry})

    out = []
    for cluster in clusters:
        rep = dict(cluster["entry"])
        rep["key"] = normalise_key(" ".join(sorted(cluster["tokens"]))) if cluster["tokens"] else rep["key"]
        rep["ambiguous"] = False  # a firm name is never "surname-only ambiguous"
        rep["evidence_names"] = sorted(set(cluster["names"]))
        out.append(rep)
    return out


def clean_advocates(advocates: list[dict]) -> list[dict]:
    """Runs the full cleanup pipeline on one flat list of extractor-shaped
    dicts: fragment-stripping + casing fix on every entry's name, ambiguous
    flagging on personal names, and firm-name clustering within this list."""
    cleaned = []
    for entry in advocates:
        e = dict(entry)
        e["name"] = fix_casing(strip_trailing_fragments(e["name"]))
        e["key"] = normalise_key(e["name"])
        cleaned.append(e)

    firms = [e for e in cleaned if e.get("kind") == "firm"]
    non_firms = [e for e in cleaned if e.get("kind") != "firm"]

    for e in non_firms:
        e["ambiguous"] = is_surname_only(e["key"])
        e.setdefault("evidence_names", [e["name"]])

    return non_firms + cluster_firms(firms)


def clean_advocates_by_doc(advocates_by_doc: dict) -> dict:
    """Applies clean_advocates() GLOBALLY across the whole corpus so firm
    variants in different documents still collapse to one canonical key,
    then remaps every document's list to use that canonical (key, name,
    ambiguous) - doc->advocate structure is preserved, only the entries are
    cleaned and re-keyed."""
    doc_ids = list(advocates_by_doc.keys())
    origin = []  # parallel to `flat`: which doc_id each flat[i] came from
    flat = []
    for doc_id in doc_ids:
        for entry in advocates_by_doc[doc_id]:
            flat.append(entry)
            origin.append(doc_id)

    out_by_doc = {doc_id: [] for doc_id in doc_ids}

    # Non-firm entries clean 1:1, independent of every other entry in the corpus.
    for doc_id, e in zip(origin, flat):
        if e.get("kind") == "firm":
            continue
        ce = dict(e)
        ce["name"] = fix_casing(strip_trailing_fragments(ce["name"]))
        ce["key"] = normalise_key(ce["name"])
        ce["ambiguous"] = is_surname_only(ce["key"])
        ce.setdefault("evidence_names", [ce["name"]])
        out_by_doc[doc_id].append(ce)

    # Firm entries cluster against every firm in the whole corpus, then get
    # remapped back onto the documents they originally came from.
    firm_entries_with_doc = [(doc_id, e) for doc_id, e in zip(origin, flat) if e.get("kind") == "firm"]
    pre_cleaned_firms = [
        {**e, "name": fix_casing(strip_trailing_fragments(e["name"]))}
        for _, e in firm_entries_with_doc
    ]
    clustered_firms = cluster_firms(pre_cleaned_firms)
    name_to_canonical = {
        raw_name: canon for canon in clustered_firms for raw_name in canon["evidence_names"]
    }
    for (doc_id, _), pre_cleaned in zip(firm_entries_with_doc, pre_cleaned_firms):
        canon = name_to_canonical.get(pre_cleaned["name"])
        if canon is not None:
            out_by_doc[doc_id].append(canon)

    return out_by_doc
