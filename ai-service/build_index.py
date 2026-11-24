"""Reproduces SentenceTransformer_Base.ipynb end to end and writes the
production artifacts the FastAPI service loads at startup:

  artifacts/passages.parquet         - one row per (doc_id, passage_no)
  artifacts/passage_embeddings.npy   - float32, unit-normalized, row-aligned with passages.parquet
  artifacts/engine_meta.json         - model name, threshold, config, advocates_by_doc, doc metadata

Run with defaults (small enough for a laptop CPU):

    python build_index.py

Scale up (needs a GPU in practice — see README for the Colab path):

    python build_index.py --max-docs-per-area 500 --max-passages-per-doc 40

Requires internet access on first run (downloads the HF dataset and the
sentence-transformer weights, both cached afterwards).
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

import certifi
os.environ["SSL_CERT_FILE"] = certifi.where()

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

from engine.cleaning import CleaningLog, flatten_schema, normalize_and_dedupe, rebuild_documents
from engine.config import DEFAULT_CONFIG
from engine.embedder import Embedder
from engine.extractor import extract_advocates
from engine.labelling import label_documents
from engine.passages import build_passage_frame
from eval.queries import EVAL_QUERIES, OFF_TOPIC


def parse_args():
    p = argparse.ArgumentParser(description="Build the WakiliMatch AI matching index.")
    p.add_argument("--seed", type=int, default=DEFAULT_CONFIG["SEED"])
    p.add_argument("--min-doc-words", type=int, default=DEFAULT_CONFIG["MIN_DOC_WORDS"])
    p.add_argument("--passage-words", type=int, default=DEFAULT_CONFIG["PASSAGE_WORDS"])
    p.add_argument("--passage-overlap", type=int, default=DEFAULT_CONFIG["PASSAGE_OVERLAP"])
    p.add_argument("--max-docs-per-area", type=int, default=DEFAULT_CONFIG["MAX_DOCS_PER_AREA"])
    p.add_argument("--max-passages-per-doc", type=int, default=DEFAULT_CONFIG["MAX_PASSAGES_PER_DOC"])
    p.add_argument("--base-model", default=DEFAULT_CONFIG["BASE_MODEL"])
    p.add_argument("--dataset-name", default=DEFAULT_CONFIG["DATASET_NAME"])
    p.add_argument("--dataset-split", default=DEFAULT_CONFIG["DATASET_SPLIT"])
    p.add_argument("--max-rows", type=int, default=None,
                    help="Debug/offline aid: only load the first N raw dataset rows.")
    p.add_argument("--out-dir", default=str(Path(__file__).resolve().parent / "artifacts"))
    return p.parse_args()


def main():
    args = parse_args()
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(args.seed)

    print(f"[1/8] Loading dataset {args.dataset_name} (split={args.dataset_split}) ...")
    from datasets import load_dataset
    ds = load_dataset(args.dataset_name, split=args.dataset_split)
    raw = ds.to_pandas()
    if args.max_rows:
        raw = raw.head(args.max_rows)
    print(f"      raw shape: {raw.shape}")

    print("[2/8] Flattening schema and cleaning text ...")
    log = CleaningLog()
    df = flatten_schema(raw)
    df = normalize_and_dedupe(df, log)

    print("[3/8] Stripping chunk overlap and rebuilding whole documents ...")
    docs, overlaps = rebuild_documents(df, args.min_doc_words, log)
    for step in log.as_records():
        print(f"      {step['step']:<45} {step['rows_before']:>8,} -> {step['rows_after']:>8,}")

    print("[4/8] Labelling court/year/area/language ...")
    docs = label_documents(docs)

    print("[5/8] Extracting advocates from case law and filtering to English case law ...")
    cases = docs[docs["type"] == "case_law"].copy()
    cases["advocates"] = cases["text"].apply(extract_advocates)
    final_cases = cases[cases["language"] == "English"].copy()
    print(f"      English case-law judgments: {len(final_cases):,}")

    print("[6/8] Building passages and a stratified per-area sample ...")
    sample_docs = pd.concat([
        g.sample(min(len(g), args.max_docs_per_area), random_state=args.seed)
        for _, g in final_cases.groupby("area")
    ])
    passages_all = build_passage_frame(sample_docs, args.passage_words, args.passage_overlap)
    passages = (
        passages_all[passages_all["doc_id"].isin(sample_docs["doc_id"])]
        .groupby("doc_id", group_keys=False)
        .head(args.max_passages_per_doc)
        .reset_index(drop=True)
    )
    doc_titles = sample_docs.set_index("doc_id")["title"].to_dict()
    doc_areas = sample_docs.set_index("doc_id")["area"].to_dict()
    doc_courts = sample_docs.set_index("doc_id")["court"].to_dict()
    doc_years = sample_docs.set_index("doc_id")["year"].apply(
        lambda y: int(y) if pd.notna(y) else None
    ).to_dict()
    doc_urls = sample_docs.set_index("doc_id")["url"].to_dict()
    advocates_by_doc = sample_docs.set_index("doc_id")["advocates"].to_dict()
    print(f"      sample: {len(sample_docs):,} judgments -> {len(passages):,} passages")
    print(sample_docs["area"].value_counts().to_string())

    print(f"[7/8] Encoding passages with {args.base_model} ...")
    embedder = Embedder(args.base_model)
    t0 = time.time()
    passage_embeddings = embedder.encode(passages["text"].tolist(), show_progress_bar=True)
    print(f"      encoded {passage_embeddings.shape[0]:,} passages in {time.time() - t0:.1f}s")
    passage_doc_ids = passages["doc_id"].to_numpy(dtype=str)

    print("[8/8] Calibrating the no-good-match threshold (ROC / Youden's J) ...")
    from sklearn.metrics import roc_curve, roc_auc_score

    def dense_scores(query: str) -> np.ndarray:
        q = embedder.encode_one(query)
        return passage_embeddings @ q

    present_areas = set(doc_areas.values())
    legal_queries = [q for q, area in EVAL_QUERIES if area in present_areas]
    if len(legal_queries) < len(EVAL_QUERIES):
        skipped = sorted({area for _, area in EVAL_QUERIES} - present_areas)
        print(f"      areas with no judgments in this sample (queries skipped): {skipped}")

    top1_legal = np.array([dense_scores(q).max() for q in legal_queries])
    top1_off = np.array([dense_scores(q).max() for q in OFF_TOPIC])
    y_true = np.r_[np.ones(len(top1_legal)), np.zeros(len(top1_off))]
    scores = np.r_[top1_legal, top1_off]
    fpr, tpr, thr = roc_curve(y_true, scores)
    threshold = float(thr[np.argmax(tpr - fpr)])
    auc = float(roc_auc_score(y_true, scores))
    print(f"      AUC = {auc:.3f}; threshold = {threshold:.3f}")

    print("Saving artifacts ...")
    passages.to_parquet(out_dir / "passages.parquet", index=False)
    np.save(out_dir / "passage_embeddings.npy", passage_embeddings.astype(np.float32))

    meta = {
        "model": args.base_model,
        "threshold": threshold,
        "threshold_auc": auc,
        "config": {
            "SEED": args.seed, "MIN_DOC_WORDS": args.min_doc_words,
            "PASSAGE_WORDS": args.passage_words, "PASSAGE_OVERLAP": args.passage_overlap,
            "MAX_DOCS_PER_AREA": args.max_docs_per_area, "MAX_PASSAGES_PER_DOC": args.max_passages_per_doc,
            "BASE_MODEL": args.base_model, "DATASET_NAME": args.dataset_name,
        },
        "n_documents": len(sample_docs),
        "n_passages": len(passages),
        "advocates_by_doc": advocates_by_doc,
        "doc_titles": doc_titles,
        "doc_areas": doc_areas,
        "doc_courts": doc_courts,
        "doc_years": doc_years,
        "doc_urls": doc_urls,
    }
    with open(out_dir / "engine_meta.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, default=str)

    print(f"Done. Artifacts written to {out_dir}")
    print(f"  passages: {len(passages):,} | documents: {len(sample_docs):,} | threshold: {threshold:.3f}")


if __name__ == "__main__":
    main()
