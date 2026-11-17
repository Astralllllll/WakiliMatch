"""Tests for engine.extractor, using the notebook's own demo string
(cell 18) plus edge cases the brief calls out explicitly: state counsel
must be removed, surname-only names must be flagged ambiguous, and firm
names should be recognised."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine.extractor import extract_advocates, is_surname_only, normalise_key

DEMO = (
    "Mr. Otieno for the claimant. Ms Wanjiku h/b for Mr. Kamau Njoroge for the 1st respondent. "
    "Kamau & Co. Advocates for the Plaintiff. Ms. Jeptoo for the State. Prof. Ojienda SC for the petitioner."
)


def test_demo_string_matches_notebook_expectations():
    found = extract_advocates(DEMO)
    names = {f["name"] for f in found}

    assert "Otieno" in names
    assert "Kamau Njoroge" in names
    assert any(n.endswith("Advocates") for n in names)
    assert "Ojienda" in names  # 'SC' suffix stripped


def test_state_counsel_is_tagged_and_excluded():
    found = extract_advocates(DEMO)
    jeptoo = next(f for f in found if f["name"] == "Jeptoo")
    assert jeptoo["role"] == "state"

    hireable = [f for f in found if f["role"] != "state"]
    assert all(f["name"] != "Jeptoo" for f in hireable)


def test_surname_only_is_ambiguous():
    found = extract_advocates(DEMO)
    otieno = next(f for f in found if f["name"] == "Otieno")
    assert is_surname_only(otieno["key"]) is True

    kamau = next(f for f in found if f["name"] == "Kamau Njoroge")
    assert is_surname_only(kamau["key"]) is False


def test_firm_extraction():
    found = extract_advocates(DEMO)
    firms = [f for f in found if f["kind"] == "firm"]
    assert len(firms) == 1
    # _clean_name strips trailing punctuation, so "Co." loses its period
    assert firms[0]["name"] == "Kamau & Co Advocates"


def test_holding_brief_pattern():
    found = extract_advocates(DEMO)
    wanjiku_present = any(f["kind"] == "counsel" and "Kamau" in f["name"] for f in found)
    assert wanjiku_present  # h/b for Mr. Kamau Njoroge resolves to the represented counsel


def test_no_appearances_returns_empty():
    assert extract_advocates("This judgment contains no appearance lines at all.") == []


def test_normalise_key_strips_case_and_punctuation():
    assert normalise_key("Dr. Otieno-Kamau") == "dr otieno kamau"


def test_duplicate_mentions_are_deduplicated():
    text = "Mr. Otieno for the claimant. Later, Mr. Otieno for the claimant again."
    found = extract_advocates(text)
    assert len(found) == 1
