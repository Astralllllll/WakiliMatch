"""Embedding index, judgment ranking, and advocate aggregation.

Ported from SentenceTransformer_Base.ipynb cell 45 (rank_cases, dense_scores)
and the match_lawyers() helper from cell 45 / section 3.3, generalized so the
FastAPI layer can pass top_cases/top_lawyers per request instead of the
notebook's hardcoded demo values.
"""

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass
class SearchIndex:
    """In-memory index loaded once at service startup from artifacts/."""
    passage_embeddings: np.ndarray       # (n_passages, dim) float32, unit-normalized
    passage_doc_ids: np.ndarray          # (n_passages,) str — doc_id per passage row
    doc_titles: dict
    doc_areas: dict
    doc_courts: dict
    doc_years: dict
    doc_urls: dict
    advocates_by_doc: dict
    model_name: str
    threshold: float
    config: dict


def rank_cases(passage_scores: np.ndarray, passage_doc_ids: np.ndarray, top_n: int) -> pd.Series:
    """A judgment's score is its best-matching passage's score."""
    s = pd.Series(passage_scores).groupby(passage_doc_ids).max()
    return s.sort_values(ascending=False).head(top_n)


def dense_scores(query_embedding: np.ndarray, passage_embeddings: np.ndarray) -> np.ndarray:
    """Both sides are unit-normalized, so dot product == cosine similarity."""
    return passage_embeddings @ query_embedding


def rank_lawyers_for_cases(
    ranked_docs: pd.Series,
    advocates_by_doc: dict,
    doc_titles: dict,
    doc_areas: dict,
    top_lawyers: int,
) -> list[dict]:
    """Sums case-similarity per advocate key across the ranked judgments,
    excluding state/republic/prosecution counsel (not hireable)."""
    rows = []
    for doc_id, score in ranked_docs.items():
        for a in advocates_by_doc.get(doc_id, []):
            if a["role"] == "state":
                continue
            rows.append({
                "lawyer": a["name"], "key": a["key"], "score": float(score),
                "case": doc_titles.get(doc_id, doc_id), "doc_id": doc_id, "area": doc_areas.get(doc_id),
            })
    if not rows:
        return []

    r = pd.DataFrame(rows)
    grouped = (
        r.groupby("key")
        .agg(
            lawyer=("lawyer", "first"),
            match_score=("score", "sum"),
            relevant_cases=("case", "nunique"),
            example_case=("case", "first"),
            areas=("area", lambda x: ", ".join(sorted(set(x.dropna())))),
        )
        .sort_values("match_score", ascending=False)
        .head(top_lawyers)
        .reset_index()
    )

    # attach per-key case evidence (doc_id + title + score) for "why this lawyer"
    evidence_by_key = {}
    for key, g in r.groupby("key"):
        evidence_by_key[key] = (
            g.drop_duplicates("doc_id")
            .sort_values("score", ascending=False)
            .head(3)[["doc_id", "case", "score"]]
            .to_dict("records")
        )

    out = []
    for row in grouped.itertuples():
        out.append({
            "name": row.lawyer,
            "key": row.key,
            "match_score": round(float(row.match_score), 4),
            "relevant_cases": int(row.relevant_cases),
            "example_case": row.example_case,
            "areas": row.areas,
            "evidence": evidence_by_key.get(row.key, []),
        })
    return out


def search(
    query_embedding: np.ndarray,
    index: SearchIndex,
    top_cases: int,
    top_lawyers: int,
) -> dict:
    scores = dense_scores(query_embedding, index.passage_embeddings)
    ranked_docs = rank_cases(scores, index.passage_doc_ids, top_cases)

    top_similarity = float(ranked_docs.iloc[0]) if len(ranked_docs) else 0.0
    no_good_match = top_similarity < index.threshold

    cases = [
        {
            "doc_id": doc_id,
            "title": index.doc_titles.get(doc_id, doc_id),
            "court": index.doc_courts.get(doc_id),
            "year": index.doc_years.get(doc_id),
            "area": index.doc_areas.get(doc_id),
            "similarity": round(float(score), 4),
            "url": index.doc_urls.get(doc_id),
        }
        for doc_id, score in ranked_docs.items()
    ]

    lawyers = rank_lawyers_for_cases(ranked_docs, index.advocates_by_doc, index.doc_titles, index.doc_areas, top_lawyers)

    return {
        "top_similarity": round(top_similarity, 4),
        "no_good_match": bool(no_good_match),
        "cases": cases,
        "advocates": lawyers,
    }
