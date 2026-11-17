"""Rule-based advocate extractor for Kenyan judgment appearance lines.

Ported verbatim from SentenceTransformer_Base.ipynb cell 18. Matches
patterns like "Mr. Otieno for the claimant", "Ms. Wanjiku h/b for Mr. Kamau
for the 1st respondent", "Kamau & Co. Advocates for the plaintiff". State
counsel (state/republic/prosecution) are tagged role='state' so callers can
filter them out before ranking — a client cannot hire a public prosecutor.
"""

import re

PARTY = (
    r"(?i:((?:\d+(?:st|nd|rd|th)\s+)?(?:appellants?|respondents?|applicants?|claimants?|plaintiffs?|defendants?|"
    r"petitioners?|accused(?: persons?)?|interested part(?:y|ies)|state|republic|prosecution|complainants?|"
    r"objectors?|protestors?|interveners?|decree[- ]holders?|judgment[- ]debtors?|employers?|grievants?|union)))"
)
STATE_ROLES = ("state", "republic", "prosecution")
TITLE = r"(?:Mr|Mrs|Ms|Miss|Dr|Prof|Professor)"
NAME = r"((?:[A-Z][A-Za-z'\-]+)(?:\s+(?:[A-Z][A-Za-z'\-]+|[A-Z]\.?)){0,3})"

P_COUNSEL = re.compile(TITLE + r"\s+" + NAME + r"(?:\s*,?\s*S\.?C\.?)?[^.;\n]{0,60}?\b(?i:for\s+the)\s+" + PARTY)
P_HB = re.compile(r"(?:h/b|holding brief)\s+for\s+" + TITLE + r"\s+" + NAME + r"[^.;\n]{0,40}?\b(?i:for\s+the)\s+" + PARTY)
P_FIRM = re.compile(
    r"(?:M/s\.?\s+)?((?:[A-Z][A-Za-z'\-]+(?:,|\s)+(?:&\s+|and\s+)?){1,5}"
    r"(?:Co\.?\s*|Company\s+|Associates\s+|Partners\s+|LLP\s+)?)Advocates\b"
)
FIRM_STOP = {"the", "learned", "counsel", "kenya", "law", "society", "act", "for", "both", "their", "his",
             "her", "respective", "said", "senior", "all", "by", "instructed", "other", "two"}


def _clean_name(n: str) -> str:
    n = re.sub(r"\s+", " ", n).strip(" ,.&")
    return re.sub(r"\s+S\.?C\.?$", "", n)  # 'Ojienda SC' -> 'Ojienda' (SC = Senior Counsel title)


def normalise_key(n: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z ]", " ", n.lower())).strip()


def extract_advocates(text: str) -> list[dict]:
    t = re.sub(r"\b(Mr|Mrs|Ms|Dr|Prof)\.", r"\1", text)  # 'Mr.' -> 'Mr' so the period isn't read as a sentence end
    found = []
    for pat, kind in ((P_COUNSEL, "counsel"), (P_HB, "counsel")):
        for m in pat.finditer(t):
            name = _clean_name(m.group(1))
            role = re.sub(r"^\d+(st|nd|rd|th)\s+", "", m.group(2).lower()).rstrip("s")
            found.append({
                "name": name,
                "key": normalise_key(name),
                "kind": kind,
                "role": "state" if any(r in role for r in STATE_ROLES) else role,
            })
    for m in P_FIRM.finditer(t):
        name = _clean_name(m.group(1))
        words = [w for w in re.findall(r"[A-Za-z']+", name)]
        while words and words[0].lower() in FIRM_STOP:
            words = words[1:]
        if not words or all(w.lower() in FIRM_STOP | {"co", "company", "associates", "partners", "llp", "and"} for w in words):
            continue
        name = re.sub(r"^(?:(?:%s)\s+)+" % "|".join(FIRM_STOP), "", name, flags=re.I).strip(" ,&")
        found.append({"name": name + " Advocates", "key": normalise_key(name), "kind": "firm", "role": "firm"})

    seen, out = set(), []
    for f in found:
        if f["key"] and (f["key"], f["kind"]) not in seen:
            seen.add((f["key"], f["kind"]))
            out.append(f)
    return out


def is_surname_only(key: str) -> bool:
    """A single-token normalised key ('kamau') is ambiguous — many advocates
    share one surname. Callers must not auto-link these to a registered
    lawyer by name alone (see brief section 4.2)."""
    return len(key.split()) == 1
