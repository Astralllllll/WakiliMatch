"""Court/year/practice-area feature engineering and language detection.

Ported from SentenceTransformer_Base.ipynb cell 16, unmodified. Practice
area is assigned from the specialised court first, then title rules in
order (first match wins); "General Civil" and "Unclassified" stay in the
index as realistic distractors but are excluded from supervised checks.
"""

import re

import pandas as pd

COURTS = {  # Kenya Law neutral-citation court codes
    "kesc": "Supreme Court", "keca": "Court of Appeal", "kehc": "High Court",
    "keelrc": "Employment & Labour Relations Court", "keic": "Industrial Court (pre-2012)",
    "keelc": "Environment & Land Court", "kemc": "Magistrates' Court", "kekc": "Kadhi's Court",
    "ketat": "Tax Appeals Tribunal", "kebprt": "Business Premises Rent Tribunal",
}

COURT_AREA = {
    "keelrc": "Employment & Labour", "keic": "Employment & Labour", "keelc": "Land & Property",
    "kebprt": "Land & Property", "ketat": "Tax", "kekc": "Family & Succession",
}

TITLE_RULES = [  # order matters: the first match wins
    ("Constitutional & Administrative", r"judicial review|ex[\s\-]?parte|constitutional|human rights|\bpetition\b"),
    ("Criminal", r"criminal|\brepublic v\b|\bv\.? republic\b|murder|robbery|sexual offences|defilement|\bbail\b"),
    ("Family & Succession", r"succession|probate|estate of|divorce|matrimonial|custody|children case|adoption|family"),
    ("Land & Property", r"environment (?:and|&) land|\belc\b|land case|land appeal|tenancy|rent"),
    ("Employment & Labour", r"employment|labour|industrial cause"),
    ("Tax", r"\btax\b|income tax|vat appeal"),
    ("Commercial & Contract", r"commercial|winding up|insolvency|bankruptcy|arbitration|companies"),
    ("General Civil", r"civil appeal|civil suit|civil case|civil application|\bhccc\b|miscellaneous"),
]

SW_WORDS = {"na", "ya", "wa", "kwa", "katika", "ni", "hii", "kuwa", "za", "la", "cha", "hiyo",
            "yake", "lakini", "mahakama", "shauri", "hakimu", "mshtakiwa"}
EN_WORDS = {"the", "of", "and", "to", "in", "that", "is", "for", "was", "court", "be", "by"}


def court_year_date(row) -> pd.Series:
    url, title = str(row["url"]), str(row["title"])
    code_, year = None, None
    m = re.search(r"/judgment/([a-z]+)/(\d{4})/", url)
    if m:
        code_, year = m.group(1), int(m.group(2))
    else:
        m2 = re.search(r"\[(\d{4})\]\s*(KE[A-Z]+)", title)
        if m2:
            year, code_ = int(m2.group(1)), m2.group(2).lower()
    if year is None and "date" in row and pd.notna(row["date"]):
        y = re.search(r"(19|20)\d{2}", str(row["date"]))
        year = int(y.group(0)) if y else None
    d = re.search(r"@(\d{4}-\d{2}-\d{2})", url)
    if year is not None and not (1930 <= year <= 2026):
        year = None  # impossible years = parsing noise
    return pd.Series({"court_code": code_, "year": year, "decision_date": d.group(1) if d else None})


def practice_area(row) -> pd.Series:
    if row["court_code"] in COURT_AREA:
        return pd.Series({"area": COURT_AREA[row["court_code"]], "area_source": "court"})
    t = str(row["title"]).lower()
    for area, pat in TITLE_RULES:
        if re.search(pat, t):
            return pd.Series({"area": area, "area_source": "title"})
    return pd.Series({"area": "Unclassified", "area_source": "none"})


def detect_language(text: str) -> str:
    """Swahili vs English heuristic from a fixed small word list, checked
    against only the first 6000 chars (matches notebook exactly)."""
    w = re.findall(r"[a-z]+", text[:6000].lower())
    return "Swahili" if sum(x in SW_WORDS for x in w) > sum(x in EN_WORDS for x in w) else "English"


def label_documents(docs: pd.DataFrame) -> pd.DataFrame:
    """Applies court/year/area/language labelling to a rebuilt-documents frame."""
    docs = pd.concat([docs, docs.apply(court_year_date, axis=1)], axis=1)
    docs["court"] = docs["court_code"].map(COURTS).fillna(docs["court_code"].str.upper()).fillna("Unknown")
    docs = pd.concat([docs, docs.apply(practice_area, axis=1)], axis=1)
    docs.loc[docs["type"] != "case_law", ["area", "area_source"]] = ["Legislation", "n/a"]
    docs["language"] = docs["text"].apply(detect_language)
    return docs
