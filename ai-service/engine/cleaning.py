"""Schema flattening, text normalization, and chunk-overlap removal.

Ported from SentenceTransformer_Base.ipynb cells 8 (parse_meta/is_blank),
12 (clean_text + dedup), and 14 (overlap_len + document rebuild). Behaviour
is kept identical to the notebook, including the choice NOT to lowercase or
strip stopwords here — the sentence-transformer needs natural sentences.
"""

import ast
import json
import re
import unicodedata

import numpy as np
import pandas as pd


def parse_meta(m):
    """Metadata may arrive as a dict, a JSON string, a Python-literal string, or be missing."""
    if isinstance(m, dict):
        return m
    if isinstance(m, str) and m.strip():
        try:
            return json.loads(m)
        except json.JSONDecodeError:
            try:
                return ast.literal_eval(m)
            except Exception:
                return {}
    return {}


def is_blank(s: pd.Series) -> pd.Series:
    return s.isna() | s.astype(str).str.strip().isin(["", "nan", "None", "null", "NaN"])


def flatten_schema(raw: pd.DataFrame) -> pd.DataFrame:
    """Normalizes dataset variants (metadata nested vs top-level columns) into
    a single frame with text, title, url, type, section, chunk_id present."""
    df = raw.copy()
    if "metadata" in df.columns:
        meta = pd.json_normalize(df["metadata"].apply(parse_meta).tolist())
        meta.index = df.index
        for col in meta.columns:
            if col in df.columns:
                df[col] = df[col].where(~is_blank(df[col]), meta[col])
            else:
                df[col] = meta[col]
        df = df.drop(columns=["metadata"])

    for col in ["text", "title", "url", "type", "section", "chunk_id"]:
        if col not in df.columns:
            df[col] = np.nan
    return df


def clean_text(t) -> str:
    """NFKC + whitespace normalization only — no lowercasing, no stopword removal."""
    if t is None or (isinstance(t, float) and np.isnan(t)):
        return ""
    t = unicodedata.normalize("NFKC", str(t))
    t = re.sub(r"[\x00-\x08\x0b-\x1f\x7f]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


class CleaningLog:
    def __init__(self):
        self.steps = []

    def log(self, step, before, after, why):
        self.steps.append({"step": step, "rows_before": before, "rows_after": after,
                            "removed": before - after, "reason": why})

    def as_records(self):
        return list(self.steps)


def normalize_and_dedupe(df: pd.DataFrame, log: CleaningLog | None = None) -> pd.DataFrame:
    """Standardizes `type`, cleans text, builds doc_id/chunk_idx, drops dupes.
    Mirrors notebook cell 12 steps 1-4 exactly."""
    log = log or CleaningLog()

    df = df.copy()
    df["type"] = (
        df["type"].astype(str).str.strip().str.lower()
        .str.replace(r"[\s\-]+", "_", regex=True)
        .replace({"judgment": "case_law", "judgement": "case_law", "caselaw": "case_law", "act": "legislation"})
    )
    url_type = np.select(
        [df["url"].astype(str).str.contains("/judgment/"), df["url"].astype(str).str.contains("/act/")],
        ["case_law", "legislation"], default="unknown",
    )
    df["type"] = df["type"].where(df["type"].isin(["case_law", "legislation"]), url_type)

    df["text"] = df["text"].apply(clean_text)
    df["title"] = df["title"].apply(clean_text)
    before = len(df)
    df = df[df["text"].str.len() > 0].copy()
    log.log("Drop chunks with empty text", before, len(df), "Nothing to embed or search")

    df["doc_id"] = df["url"].where(~is_blank(df["url"]), df["chunk_id"].astype(str).str.split("##").str[0])
    pos_from_section = df["section"].astype(str).str.extract(r"(\d+)\s*$")[0]
    pos_from_id = df["chunk_id"].astype(str).str.extract(r"chunk_?(\d+)")[0]
    df["chunk_idx"] = pd.to_numeric(pos_from_section.fillna(pos_from_id), errors="coerce")
    df["chunk_idx"] = df["chunk_idx"].fillna(df.groupby("doc_id").cumcount())

    before = len(df)
    df = df.drop_duplicates(subset=["doc_id", "chunk_idx"])
    log.log("Drop repeated (document, position) rows", before, len(df), "Same chunk scraped twice")
    before = len(df)
    df = df[~df.duplicated(subset=["text"], keep="first")]
    log.log(
        "Drop exact duplicate chunk text", before, len(df),
        "A judgment listed under two URLs would be retrieved twice and double-count its lawyers",
    )

    df["chunk_words"] = df["text"].str.split().str.len()
    return df


def overlap_len(prev_words, cur_words, max_k=150, min_k=10) -> int:
    """Longest k such that the last k words of prev == the first k words of cur."""
    for k in range(min(max_k, len(prev_words), len(cur_words)), min_k - 1, -1):
        if prev_words[-k:] == cur_words[:k]:
            return k
    return 0


def rebuild_documents(df: pd.DataFrame, min_doc_words: int, log: CleaningLog | None = None):
    """Strips the measured chunk overlap and stitches each judgment's chunks
    back into one row per document. Returns (docs_df, overlap_lengths_array)."""
    log = log or CleaningLog()
    extra_cols = [c for c in ["court", "date", "citation"] if c in df.columns]
    records, overlaps = [], []

    for doc_id, g in df.sort_values(["doc_id", "chunk_idx"]).groupby("doc_id", sort=False):
        words, prev = [], None
        for t in g["text"]:
            w = t.split()
            if prev is not None:
                k = overlap_len(prev, w)
                overlaps.append(k)
                words.extend(w[k:])
            else:
                words.extend(w)
            prev = w
        first = g.iloc[0]
        rec = {"doc_id": doc_id, "type": first["type"], "title": first["title"], "url": first["url"],
               "n_chunks": len(g), "text": " ".join(words), "n_words": len(words)}
        for c in extra_cols:
            rec[c] = first[c]
        records.append(rec)

    docs = pd.DataFrame(records)
    overlaps_arr = np.array(overlaps)
    log.log("Merge chunks into whole documents", len(df), len(docs), "One row per judgment / Act; overlap removed")

    before = len(docs)
    docs = docs[docs["n_words"] >= min_doc_words].copy()
    log.log(
        f"Drop documents < {min_doc_words} words", before, len(docs),
        'Stubs such as headers or "ruling reserved" notices carry no facts to match on',
    )
    return docs, overlaps_arr
