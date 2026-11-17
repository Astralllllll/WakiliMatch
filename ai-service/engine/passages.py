"""Re-splits whole judgments into model-sized passages.

Ported from SentenceTransformer_Base.ipynb cell 36. A judgment is windowed
into PASSAGE_WORDS-word passages with PASSAGE_OVERLAP words shared between
neighbours so no sentence is cut in half; a tiny trailing remainder that's
already covered by the previous passage's overlap is dropped rather than
kept as a near-duplicate short passage.
"""

import pandas as pd


def make_passages(words: list[str], size: int, overlap: int) -> list[str]:
    step = size - overlap
    out = []
    for start in range(0, max(len(words) - overlap, 1), step):
        piece = words[start:start + size]
        if len(piece) < 25 and out:
            break
        out.append(" ".join(piece))
    return out


def build_passage_frame(final_cases: pd.DataFrame, passage_words: int, passage_overlap: int) -> pd.DataFrame:
    """final_cases must have columns: doc_id, text, area, court, year."""
    rows = []
    for r in final_cases.itertuples():
        for i, p in enumerate(make_passages(r.text.split(), passage_words, passage_overlap)):
            rows.append({"doc_id": r.doc_id, "passage_no": i, "text": p,
                         "area": r.area, "court": r.court, "year": r.year})
    return pd.DataFrame(rows)
