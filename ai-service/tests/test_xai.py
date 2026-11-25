"""Tests for engine.xai (brief section A3) - templated text only, every
number taken from the already-computed search result."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine.xai import build_why, build_xai

CASES = [
    {
        "doc_id": "d1", "title": "Doe v Roe", "court": "Environment & Land Court",
        "year": 2021, "area": "Land & Property", "similarity": 0.365, "url": "https://kenyalaw.org/d1",
    },
    {
        "doc_id": "d2", "title": "Smith v Jones", "court": "High Court",
        "year": 2019, "area": "Land & Property", "similarity": 0.301, "url": "https://kenyalaw.org/d2",
    },
]


def test_build_xai_uses_top_case_numbers():
    xai = build_xai(CASES, threshold=0.328)
    assert xai["matched_area"] == "Land & Property"
    assert xai["precedent_count"] == 2
    assert xai["threshold"] == 0.328
    assert xai["top_precedent"]["similarity_pct"] == 36.5
    assert xai["top_precedent"]["title"] == "Doe v Roe"


def test_build_xai_explanation_never_says_probability():
    xai = build_xai(CASES, threshold=0.328)
    assert "36.5%" in xai["explanation"]
    assert "semantic similarity" in xai["explanation"]
    assert "probability" not in xai["explanation"].lower()


def test_build_xai_returns_none_for_no_cases():
    assert build_xai([], threshold=0.328) is None


def test_build_why_mentions_both_semantic_and_precedent_counts():
    why = build_why(
        semantic_pct=82,
        precedent_cases=[{"title": "Doe v Roe", "court": "ELC", "year": 2021, "url": "x", "similarity_pct": 82.0}] * 2,
        components={"profile_semantic": 0.82, "precedent": 0.6, "category": 1.0, "jurisdiction": 1.0, "history": 0.4},
        lawyer_name="Her",
    )
    assert "82%" in why["plain_text"]
    assert "2 similar judgments" in why["plain_text"]
    assert why["components"]["category"] == 1.0


def test_build_why_falls_back_without_precedent_or_semantic():
    why = build_why(semantic_pct=None, precedent_cases=[], components={}, lawyer_name="Mary Kamau")
    assert "Mary Kamau" in why["plain_text"]
    assert why["precedent_cases"] == []
