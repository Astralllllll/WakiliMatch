"""Reports retrieval quality against the 35 labelled queries (notebook 3.4)
and grouped 5-fold cross-validation with a regularisation curve on the
passage embeddings (notebook 3.5). Requires build_index.py to have been run
first (reads artifacts/passages.parquet + passage_embeddings.npy).

Usage:
    python eval/run_eval.py
Writes eval/RESULTS.md.
"""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine.embedder import Embedder
from eval.queries import EVAL_QUERIES

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "artifacts"
SEED = 42


def load_artifacts():
    passages = pd.read_parquet(ARTIFACTS_DIR / "passages.parquet")
    passage_embeddings = np.load(ARTIFACTS_DIR / "passage_embeddings.npy")
    with open(ARTIFACTS_DIR / "engine_meta.json", encoding="utf-8") as f:
        meta = json.load(f)
    return passages, passage_embeddings, meta


def rank_cases(passage_scores, passage_doc_ids, top_n=20):
    s = pd.Series(passage_scores).groupby(passage_doc_ids).max()
    return s.sort_values(ascending=False).head(top_n)


def metrics_for(ranked_doc_ids, true_area, doc_area, k_list=(5, 10)):
    rel = np.array([doc_area.get(d) == true_area for d in ranked_doc_ids], dtype=float)
    out = {f"P@{k}": rel[:k].mean() if len(rel) else 0 for k in k_list}
    hits = np.flatnonzero(rel)
    out["MRR"] = 1 / (hits[0] + 1) if len(hits) else 0.0
    gains = rel[:10] / np.log2(np.arange(2, min(10, len(rel)) + 2))
    n_rel = sum(1 for v in doc_area.values() if v == true_area)
    ideal = np.ones(min(10, n_rel)) / np.log2(np.arange(2, min(10, n_rel) + 2))
    out["nDCG@10"] = gains.sum() / ideal.sum() if ideal.sum() else 0
    return out


def run_retrieval_eval(embedder, passage_embeddings, passage_doc_ids, doc_area):
    present_areas = set(doc_area.values())
    eval_df = pd.DataFrame(
        [(q, a) for q, a in EVAL_QUERIES if a in present_areas], columns=["query", "area"]
    )
    skipped = sorted({a for _, a in EVAL_QUERIES} - present_areas)

    rows = []
    for r in eval_df.itertuples():
        q_emb = embedder.encode_one(r.query)
        scores = passage_embeddings @ q_emb
        ranked = rank_cases(scores, passage_doc_ids, top_n=20).index
        rows.append({"query": r.query, "area": r.area, **metrics_for(ranked, r.area, doc_area)})
    res = pd.DataFrame(rows)

    area_counts = pd.Series(list(doc_area.values())).value_counts(normalize=True)
    random_p = eval_df["area"].map(area_counts).mean()
    return res, random_p, skipped


def run_grouped_cv(passages, passage_embeddings):
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import StratifiedGroupKFold, StratifiedKFold, cross_val_score

    lab_mask = ~passages["area"].isin(["General Civil", "Unclassified"]).to_numpy()
    area_docs = passages.loc[lab_mask].groupby("area")["doc_id"].nunique()
    keep_areas = area_docs[area_docs >= 10].index
    mask = lab_mask & passages["area"].isin(keep_areas).to_numpy()

    if mask.sum() == 0 or len(keep_areas) < 2:
        return None

    X = passage_embeddings[mask]
    y = passages.loc[mask, "area"].to_numpy(dtype=str)
    groups = passages.loc[mask, "doc_id"].to_numpy(dtype=str)

    n_groups_per_class = pd.Series(y).groupby(y).apply(lambda s: pd.Series(groups[s.index]).nunique())
    n_splits = min(5, int(n_groups_per_class.min())) if len(n_groups_per_class) else 0
    if n_splits < 2:
        return None

    cv_group = StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=SEED)
    curve = []
    for C in (0.01, 0.1, 1, 10, 100):
        clf = LogisticRegression(C=C, max_iter=3000, class_weight="balanced")
        tr, te = [], []
        for tr_idx, te_idx in cv_group.split(X, y, groups):
            clf.fit(X[tr_idx], y[tr_idx])
            from sklearn.metrics import f1_score
            tr.append(f1_score(y[tr_idx], clf.predict(X[tr_idx]), average="macro"))
            te.append(f1_score(y[te_idx], clf.predict(X[te_idx]), average="macro"))
        curve.append({"C": C, "train_F1": np.mean(tr), "cv_F1": np.mean(te), "cv_F1_std": np.std(te)})
    curve = pd.DataFrame(curve)
    best_C = curve.loc[curve["cv_F1"].idxmax(), "C"]

    best_clf = LogisticRegression(C=best_C, max_iter=3000, class_weight="balanced")
    grouped = cross_val_score(best_clf, X, y, groups=groups, cv=cv_group, scoring="f1_macro")
    naive = cross_val_score(
        best_clf, X, y, cv=StratifiedKFold(n_splits, shuffle=True, random_state=SEED), scoring="f1_macro"
    )
    return {
        "curve": curve, "best_C": best_C, "n_splits": n_splits,
        "grouped_mean": grouped.mean(), "grouped_std": grouped.std(),
        "naive_mean": naive.mean(), "chance_level": 1 / len(keep_areas),
        "keep_areas": list(keep_areas),
    }


def main():
    passages, passage_embeddings, meta = load_artifacts()
    doc_area = meta["doc_areas"]
    embedder = Embedder(meta["model"])
    passage_doc_ids = passages["doc_id"].to_numpy(dtype=str)

    res, random_p, skipped = run_retrieval_eval(embedder, passage_embeddings, passage_doc_ids, doc_area)
    summary = res[["P@5", "P@10", "MRR", "nDCG@10"]].mean().round(3)

    cv = run_grouped_cv(passages, passage_embeddings)

    lines = ["# AI service evaluation results", ""]
    lines.append(f"Model: `{meta['model']}` | Index: {meta['n_documents']:,} documents, "
                 f"{meta['n_passages']:,} passages | Threshold: {meta['threshold']:.3f}")
    lines.append("")
    lines.append("## Retrieval metrics (35 labelled queries, notebook 3.4)")
    if skipped:
        lines.append(f"\n_Areas with no judgments in this index (queries skipped): {skipped}_\n")
    lines.append("")
    lines.append("| Metric | Score |")
    lines.append("|---|---|")
    for k, v in summary.items():
        lines.append(f"| {k} | {v:.3f} |")
    lines.append(f"| Random baseline P@5 | {random_p:.3f} |")
    lines.append(f"| Lift at P@5 | {summary['P@5'] / random_p:.1f}x |" if random_p > 0 else "")
    lines.append("")
    lines.append("### Per-area P@5 / MRR")
    lines.append("")
    per_area = res.groupby("area")[["P@5", "MRR"]].mean().round(3).sort_values("P@5")
    lines.append(per_area.to_markdown())
    lines.append("")

    lines.append("## Grouped 5-fold cross-validation with regularisation curve (notebook 3.5)")
    lines.append("")
    if cv is None:
        lines.append("_Not enough judgments per area in this sample to run grouped CV "
                      "(need >= 10 judgments in at least 2 non-General/Unclassified areas). "
                      "Rebuild the index with a larger --max-docs-per-area to populate this section._")
    else:
        lines.append(f"Areas evaluated: {cv['keep_areas']} | folds: {cv['n_splits']}")
        lines.append("")
        lines.append("| C | train macro-F1 | CV macro-F1 | CV std |")
        lines.append("|---|---|---|---|")
        for row in cv["curve"].itertuples():
            lines.append(f"| {row.C} | {row.train_F1:.3f} | {row.cv_F1:.3f} | {row.cv_F1_std:.3f} |")
        lines.append("")
        lines.append(f"Best C: **{cv['best_C']}**")
        lines.append(f"Grouped CV macro-F1: **{cv['grouped_mean']:.3f} +/- {cv['grouped_std']:.3f}**")
        lines.append(f"Naive (ungrouped) CV macro-F1: {cv['naive_mean']:.3f} "
                     f"(leakage would inflate the score by {cv['naive_mean'] - cv['grouped_mean']:+.3f})")
        lines.append(f"Chance level: ~{cv['chance_level']:.3f}")
    lines.append("")

    out_path = Path(__file__).resolve().parent / "RESULTS.md"
    out_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {out_path}")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
