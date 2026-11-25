"""Tests for engine.advocate_cleanup (brief section A5), using the exact
real observed outputs the brief names: a party-clause fragment ('Adv For
The'), a near-duplicate firm pair ('Kihoro Kimani Adv' vs 'Kihoro Kimani &
Associates Advocates'), and mangled casing ('KiRUKI')."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from engine.advocate_cleanup import (
    clean_advocates, clean_advocates_by_doc, cluster_firms, fix_casing, strip_trailing_fragments,
)


def test_strips_adv_for_the_fragment():
    assert strip_trailing_fragments("Kihoro Kimani Adv For The Appellant") == "Kihoro Kimani"


def test_strips_bare_for_the_fragment():
    assert strip_trailing_fragments("Otieno For The 2nd Respondent") == "Otieno"


def test_strips_versus_fragment():
    assert strip_trailing_fragments("Otieno Versus Republic") == "Otieno"
    assert strip_trailing_fragments("Otieno Verses Republic") == "Otieno"


def test_fixes_mangled_casing():
    assert fix_casing("KiRUKI") == "Kiruki"


def test_casing_preserves_abbreviations_and_apostrophes():
    assert fix_casing("Ojienda SC") == "Ojienda SC"
    assert fix_casing("O'Brien") == "O'Brien"


def test_near_duplicate_firms_collapse_to_one_key():
    firms = [
        {"name": "Kihoro Kimani Adv", "key": "kihoro kimani adv", "kind": "firm", "role": "firm"},
        {"name": "Kihoro Kimani & Associates Advocates", "key": "kihoro kimani associates advocates",
         "kind": "firm", "role": "firm"},
    ]
    clustered = cluster_firms(firms)
    assert len(clustered) == 1
    assert clustered[0]["name"] == "Kihoro Kimani & Associates Advocates"  # longest raw variant kept
    assert set(clustered[0]["evidence_names"]) == {"Kihoro Kimani Adv", "Kihoro Kimani & Associates Advocates"}
    assert clustered[0]["ambiguous"] is False


def test_unrelated_firms_do_not_collapse():
    firms = [
        {"name": "Kihoro Kimani Adv", "key": "a", "kind": "firm", "role": "firm"},
        {"name": "Otieno & Wambua Advocates", "key": "b", "kind": "firm", "role": "firm"},
    ]
    assert len(cluster_firms(firms)) == 2


def test_surname_only_stays_ambiguous_after_cleanup():
    advocates = [
        {"name": "KiRUKI", "key": "kiruki", "kind": "counsel", "role": "claimant"},
        {"name": "Kamau Njoroge", "key": "kamau njoroge", "kind": "counsel", "role": "respondent"},
    ]
    cleaned = clean_advocates(advocates)
    kiruki = next(e for e in cleaned if e["name"] == "Kiruki")
    kamau = next(e for e in cleaned if e["name"] == "Kamau Njoroge")
    assert kiruki["ambiguous"] is True
    assert kamau["ambiguous"] is False


def test_clean_advocates_by_doc_merges_firm_across_documents():
    advocates_by_doc = {
        "docA": [{"name": "Kihoro Kimani Adv", "key": "a", "kind": "firm", "role": "firm"}],
        "docB": [{"name": "Kihoro Kimani & Associates Advocates", "key": "b", "kind": "firm", "role": "firm"}],
    }
    cleaned = clean_advocates_by_doc(advocates_by_doc)
    key_a = cleaned["docA"][0]["key"]
    key_b = cleaned["docB"][0]["key"]
    assert key_a == key_b  # same firm, same canonical key, even from different documents


def test_clean_advocates_by_doc_preserves_doc_structure():
    advocates_by_doc = {
        "docA": [{"name": "Otieno", "key": "otieno", "kind": "counsel", "role": "claimant"}],
        "docB": [],
    }
    cleaned = clean_advocates_by_doc(advocates_by_doc)
    assert set(cleaned.keys()) == {"docA", "docB"}
    assert cleaned["docB"] == []
    assert cleaned["docA"][0]["ambiguous"] is True
