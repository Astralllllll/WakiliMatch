"""Every tunable number lives here, ported 1:1 from SentenceTransformer_Base.ipynb
(cell 4's CONFIG dict) so index builds stay reproducible and the notebook
remains the source of truth. Override via CLI flags in build_index.py, not
by editing these defaults.
"""

DEFAULT_CONFIG = {
    "SEED": 42,
    "MIN_DOC_WORDS": 50,
    "PASSAGE_WORDS": 160,
    "PASSAGE_OVERLAP": 30,
    "MAX_DOCS_PER_AREA": 150,
    "MAX_PASSAGES_PER_DOC": 25,
    "BASE_MODEL": "sentence-transformers/all-MiniLM-L6-v2",
    "DATASET_NAME": "MakiniAI/kenya-law-corpus",
    "DATASET_SPLIT": "train",
}

TOP_CASES_DEFAULT = 20
TOP_LAWYERS_DEFAULT = 10
