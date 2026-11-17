"""Tests for engine.passages re-splitting (notebook cell 36 / CONFIG
PASSAGE_WORDS=160, PASSAGE_OVERLAP=30)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine.passages import make_passages


def words(n, prefix="w"):
    return [f"{prefix}{i}" for i in range(n)]


def test_short_text_returns_single_passage():
    w = words(50)
    out = make_passages(w, size=160, overlap=30)
    assert len(out) == 1
    assert out[0] == " ".join(w)


def test_long_text_splits_with_overlap():
    w = words(350)
    out = make_passages(w, size=160, overlap=30)
    # step = 160 - 30 = 130; starts at 0, 130, 260 -> 3 passages
    assert len(out) == 3
    first_words = out[0].split()
    second_words = out[1].split()
    # last 30 words of passage 1 == first 30 words of passage 2 (by construction)
    assert first_words[-30:] == second_words[:30]


def test_tiny_trailing_remainder_is_dropped():
    # 300 words: passages at start=0 (160 words) and start=130 (words[130:290], 160 words)
    # next start=260 -> words[260:300] = 40 words (>= 25, so kept, not a "tiny tail")
    w = words(300)
    out = make_passages(w, size=160, overlap=30)
    assert all(len(p.split()) >= 25 for p in out)


def test_tiny_tail_below_25_words_is_dropped_when_prior_passage_exists():
    # size=100, overlap=10 -> step=90. 200 words -> starts 0, 90, 180.
    # start=180 gives words[180:200] = 20 words (< 25), and a passage
    # already exists, so it's dropped rather than kept as a near-duplicate.
    w = words(200)
    out = make_passages(w, size=100, overlap=10)
    assert len(out) == 2


def test_empty_input_returns_single_empty_passage():
    # range(0, max(0-30,1), step) still yields one iteration at start=0,
    # and the "tiny tail" guard only fires once `out` is non-empty, so the
    # first (empty) passage is always kept.
    assert make_passages([], size=160, overlap=30) == [""]
