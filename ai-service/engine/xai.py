"""Templated explanation text for the XAI block (brief section A3). No LLM:
every number is read straight off the already-computed search result, and
every sentence is a fixed template filled with those numbers. Kept separate
from retrieval.py so the explanation wording can change without touching
the ranking math, and vice versa.
"""


def build_xai(cases: list[dict], threshold: float) -> dict | None:
    """cases is retrieval.search()'s 'cases' list, already sorted by
    similarity desc. Returns None when there are no precedents at all (so
    callers never fabricate an XAI card for an empty result)."""
    if not cases:
        return None

    top = cases[0]
    similarity_pct = round(top["similarity"] * 100, 1)
    area = top.get("area")

    explanation = (
        f"Matched because {similarity_pct:.1f}% semantic similarity was found against past "
        f"decisions in {area}." if area else
        f"Matched because {similarity_pct:.1f}% semantic similarity was found against past decisions."
    )

    return {
        "matched_area": area,
        "precedent_count": len(cases),
        "threshold": threshold,
        "top_precedent": {
            "title": top.get("title"),
            "court": top.get("court"),
            "year": top.get("year"),
            "url": top.get("url"),
            "similarity_pct": similarity_pct,  # cosine*100, 1dp - "semantic similarity", never "match probability"
        },
        "explanation": explanation,
    }


def build_why(
    semantic_pct: float,
    precedent_cases: list[dict],
    components: dict,
    lawyer_name: str,
) -> dict:
    """Per-lawyer explanation. precedent_cases is a list of {title, court,
    year, url, similarity_pct}; components is {profile_semantic, precedent,
    category, jurisdiction, history}, each already a 0-1 float."""
    sentences = []
    if semantic_pct is not None:
        sentences.append(f"{lawyer_name}'s profile is a {semantic_pct:.0f}% semantic match to your description")
    if precedent_cases:
        plural = "judgment" if len(precedent_cases) == 1 else "judgments"
        sentences.append(f"{lawyer_name} appeared in {len(precedent_cases)} similar {plural}")

    if len(sentences) == 2:
        plain_text = f"{sentences[0]}, and {sentences[1]}."
    elif sentences:
        plain_text = sentences[0] + "."
    else:
        plain_text = f"{lawyer_name} matches on category and jurisdiction, with no linked case precedent yet."

    return {
        "semantic_pct": semantic_pct,
        "precedent_cases": precedent_cases,
        "components": components,
        "plain_text": plain_text,
    }
