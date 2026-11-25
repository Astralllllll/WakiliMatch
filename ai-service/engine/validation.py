"""Pre-encoding query validation and post-search status classification,
shared by every endpoint that takes a free-text query (brief section A1).

validate_query() runs BEFORE the text is ever encoded, so a bad query never
reaches the model. classify_match_result() runs AFTER search() in retrieval.py
has already produced cases/advocates, and only distinguishes "weak semantic
match" from "precedents found but no hireable advocate" - it cannot run any
earlier since it depends on the search result.
"""

import re

from engine.labelling import detect_language

MAX_QUERY_LENGTH = 2000

EXAMPLE_QUERIES = [
    "I was dismissed from my job without notice and they refused to pay my terminal dues",
    "Someone has fenced off part of my plot and claims the land is theirs",
    "My father died without a will and my uncles are taking his property",
]

STATUS_INFO = {
    "empty_query": {
        "message": "Please describe your legal issue so we can find the right lawyer for you.",
        "example_queries": EXAMPLE_QUERIES,
    },
    "invalid_input": {
        "message": "We couldn't understand that description. Please describe your legal issue in "
                    "a full sentence, using real words (max 2000 characters).",
        "example_queries": EXAMPLE_QUERIES,
    },
    "unsupported_language": {
        "message": "WakiliMatch currently supports English only. Please describe your issue in English.",
        "example_queries": EXAMPLE_QUERIES,
    },
    "low_confidence": {
        "message": "We couldn't find a strong match for this description. Try rephrasing with more "
                    "detail about your legal issue.",
        "example_queries": EXAMPLE_QUERIES,
    },
    "no_lawyers_found": {
        "message": "We found similar past cases, but no registered lawyer is currently linked to "
                    "them. Try rephrasing, or check back later as more lawyers join.",
        "example_queries": EXAMPLE_QUERIES,
    },
}

_KEYBOARD_ROWS = ("qwertyuiop", "asdfghjkl", "zxcvbnm")
_VOWELS = set("aeiou")


def _non_letter_ratio(text: str) -> float:
    chars = [c for c in text if not c.isspace()]
    if not chars:
        return 1.0
    non_letter = sum(1 for c in chars if not c.isalpha())
    return non_letter / len(chars)


def _has_repeated_run(text: str, run_len: int = 4) -> bool:
    return re.search(r"(.)\1{" + str(run_len - 1) + ",}", text) is not None


def _is_keyboard_mash(token: str) -> bool:
    """A token typed by dragging a finger along one keyboard row, e.g.
    'asdfgh' or 'qwerty' - checked as a substring of the row or its reverse."""
    t = token.lower()
    if len(t) < 4:
        return False
    return any(t in row or t in row[::-1] for row in _KEYBOARD_ROWS)


def _has_no_vowel(token: str) -> bool:
    letters = re.sub(r"[^a-z]", "", token.lower())
    return bool(letters) and not any(c in _VOWELS for c in letters)


def _is_gibberish(text: str) -> bool:
    """fewer than 3 words, under 15 characters, more than 40% non-letter
    characters, keyboard-mash/repeated-character runs, or most tokens having
    no vowels (brief section A1)."""
    words = text.split()
    if len(words) < 3 or len(text.strip()) < 15:
        return True
    if _non_letter_ratio(text) > 0.40:
        return True
    if _has_repeated_run(text):
        return True

    alpha_tokens = [w for w in words if re.search(r"[a-zA-Z]", w)]
    if alpha_tokens:
        mash_ratio = sum(_is_keyboard_mash(w) for w in alpha_tokens) / len(alpha_tokens)
        if mash_ratio >= 0.5:
            return True
        no_vowel_ratio = sum(_has_no_vowel(w) for w in alpha_tokens) / len(alpha_tokens)
        if no_vowel_ratio > 0.5:
            return True
    return False


def validate_query(text: str) -> dict:
    """Returns {status, message, example_queries, language}. status is
    "success" when there is nothing to report, otherwise one of
    STATUS_INFO's keys and message/example_queries are populated from it."""
    text = text or ""

    if not text.strip():
        return {"status": "empty_query", "language": "English", **STATUS_INFO["empty_query"]}

    if len(text) > MAX_QUERY_LENGTH or _is_gibberish(text):
        return {"status": "invalid_input", "language": "English", **STATUS_INFO["invalid_input"]}

    language = detect_language(text)
    if language == "Swahili":
        return {"status": "unsupported_language", "language": language, **STATUS_INFO["unsupported_language"]}

    return {"status": "success", "language": language, "message": None, "example_queries": []}


def classify_match_result(no_good_match: bool, advocates: list) -> str:
    """Status for an already-completed search: "low_confidence" when the top
    similarity is below the calibrated threshold, "no_lawyers_found" when
    relevant precedents exist but none have a hireable advocate attached
    (state counsel already excluded upstream), else "success"."""
    if no_good_match:
        return "low_confidence"
    if not advocates:
        return "no_lawyers_found"
    return "success"
