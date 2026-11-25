"""Tests for engine.validation (brief section A1), using the exact test
list from the brief: two keyboard-mash/gibberish strings, a punctuation-only
string, a repeated-character run, digits only, empty input, a valid but
off-topic English sentence, a Swahili sentence, and 5 valid legal queries."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine.validation import classify_match_result, validate_query

GIBBERISH_CASES = [
    "asdfgh qwerty zxcvb",
    "!!!!!!",
    "aaaaaaaaaa",
    "12345",
]

VALID_QUERIES = [
    "I was dismissed from my job without notice and they refused to pay my terminal dues",
    "The seller took my money for a plot but refuses to transfer the title deed",
    "My son was arrested and charged with robbery but he was at home that night",
    "My father died without a will and my uncles are taking his property",
    "KRA has sent me a huge tax assessment that I think is wrong",
]

SWAHILI_QUERY = "Niliachishwa kazi bila taarifa na wanakataa kunilipa stahili zangu mahakamani"


def test_empty_query():
    result = validate_query("")
    assert result["status"] == "empty_query"
    assert result["message"]
    assert 2 <= len(result["example_queries"]) <= 3


def test_whitespace_only_is_empty_query():
    result = validate_query("     \n\t  ")
    assert result["status"] == "empty_query"


def test_gibberish_inputs_are_invalid():
    for text in GIBBERISH_CASES:
        result = validate_query(text)
        assert result["status"] == "invalid_input", f"expected invalid_input for {text!r}, got {result['status']}"
        assert result["message"]
        assert 2 <= len(result["example_queries"]) <= 3


def test_query_over_max_length_is_invalid():
    result = validate_query("a legal issue about land " * 100)  # well over 2000 chars
    assert result["status"] == "invalid_input"


def test_off_topic_but_well_formed_english_passes_validation():
    # Off-topic queries are not gibberish - they fail later at the semantic
    # similarity stage (low_confidence), not at validate_query.
    result = validate_query("how do I cook pilau for ten people")
    assert result["status"] == "success"


def test_swahili_query_is_unsupported_language():
    result = validate_query(SWAHILI_QUERY)
    assert result["status"] == "unsupported_language"
    assert result["language"] == "Swahili"
    assert result["message"]
    assert 2 <= len(result["example_queries"]) <= 3


def test_valid_queries_pass():
    for q in VALID_QUERIES:
        result = validate_query(q)
        assert result["status"] == "success", f"expected success for {q!r}, got {result['status']}"
        assert result["message"] is None
        assert result["example_queries"] == []


def test_classify_match_result_low_confidence():
    assert classify_match_result(no_good_match=True, advocates=[]) == "low_confidence"
    assert classify_match_result(no_good_match=True, advocates=[{"name": "x"}]) == "low_confidence"


def test_classify_match_result_no_lawyers_found():
    assert classify_match_result(no_good_match=False, advocates=[]) == "no_lawyers_found"


def test_classify_match_result_success():
    assert classify_match_result(no_good_match=False, advocates=[{"name": "x"}]) == "success"
