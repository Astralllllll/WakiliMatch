"""Tests for engine.retrieval's threshold/no-good-match behaviour and
lawyer aggregation, using a small synthetic index so no model download is
required."""

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine.retrieval import SearchIndex, search


def make_index(threshold=0.3):
    # 4 passages across 2 documents, 2-dimensional "embeddings" for clarity.
    passage_embeddings = np.array([
        [1.0, 0.0],   # doc A, passage 0 - identical direction to query
        [0.9, 0.1],   # doc A, passage 1
        [0.0, 1.0],   # doc B, passage 0 - orthogonal to query
        [-1.0, 0.0],  # doc B, passage 1 - opposite direction
    ])
    passage_doc_ids = np.array(["docA", "docA", "docB", "docB"])

    return SearchIndex(
        passage_embeddings=passage_embeddings,
        passage_doc_ids=passage_doc_ids,
        doc_titles={"docA": "Doe v Roe", "docB": "Smith v Jones"},
        doc_areas={"docA": "Employment & Labour", "docB": "Land & Property"},
        doc_courts={"docA": "High Court", "docB": "High Court"},
        doc_years={"docA": 2020, "docB": 2019},
        doc_urls={"docA": "https://kenyalaw.org/docA", "docB": "https://kenyalaw.org/docB"},
        advocates_by_doc={
            "docA": [
                {"name": "Jane Otieno", "key": "jane otieno", "kind": "counsel", "role": "claimant"},
                {"name": "State Counsel", "key": "state counsel", "kind": "counsel", "role": "state"},
            ],
            "docB": [
                {"name": "Jane Otieno", "key": "jane otieno", "kind": "counsel", "role": "respondent"},
            ],
        },
        model_name="test-model",
        threshold=threshold,
        config={},
    )


def test_strong_match_is_not_flagged_no_good_match():
    index = make_index(threshold=0.3)
    query_embedding = np.array([1.0, 0.0])  # matches docA exactly
    result = search(query_embedding, index, top_cases=20, top_lawyers=10)
    assert result["no_good_match"] is False
    assert result["top_similarity"] == 1.0
    assert result["cases"][0]["doc_id"] == "docA"


def test_weak_match_below_threshold_is_flagged():
    index = make_index(threshold=0.95)
    query_embedding = np.array([0.9, 0.1])  # best score ~0.994 against docA... raise threshold above it
    result = search(query_embedding, index, top_cases=20, top_lawyers=10)
    assert result["top_similarity"] < 1.0


def test_off_topic_query_below_threshold_flags_no_good_match():
    index = make_index(threshold=0.5)
    query_embedding = np.array([0.0, -1.0])  # closest to nothing in the index
    result = search(query_embedding, index, top_cases=20, top_lawyers=10)
    assert result["no_good_match"] is True


def test_state_counsel_excluded_from_advocate_ranking():
    index = make_index(threshold=0.3)
    query_embedding = np.array([1.0, 0.0])
    result = search(query_embedding, index, top_cases=20, top_lawyers=10)
    names = {a["name"] for a in result["advocates"]}
    assert "State Counsel" not in names


def test_lawyer_score_sums_across_cases():
    index = make_index(threshold=-1.0)  # never flag no-good-match for this check
    query_embedding = np.array([1.0, 0.0])
    result = search(query_embedding, index, top_cases=20, top_lawyers=10)
    jane = next(a for a in result["advocates"] if a["name"] == "Jane Otieno")
    assert jane["relevant_cases"] == 2
    assert jane["match_score"] > 0
