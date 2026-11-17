"""FastAPI service exposing the WakiliMatch AI matching engine to Express
only (never the public internet directly) — see brief section 3.3.

Endpoints:
  GET  /health   - model loaded, index size, threshold
  POST /match    - client issue text -> ranked judgments + ranked advocates
  POST /embed    - arbitrary texts -> normalized embeddings (used for lawyer profiles)

Auth: every route except /health requires header X-Internal-Key to match
INTERNAL_API_KEY from the environment. This service must not be exposed
publicly — only Express talks to it.
"""

import json
import os
import sys
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

sys.path.insert(0, str(Path(__file__).resolve().parent))

from engine.embedder import Embedder
from engine.labelling import detect_language
from engine.retrieval import SearchIndex, search
from schemas import (
    EmbedRequest, EmbedResponse, HealthResponse, MatchRequest, MatchResponse,
)

load_dotenv()

ARTIFACTS_DIR = Path(os.getenv("ARTIFACTS_DIR", Path(__file__).resolve().parent / "artifacts"))
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="WakiliMatch AI Service")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_state = {"embedder": None, "index": None}


def require_internal_key(x_internal_key: str = Header(default="")):
    if not INTERNAL_API_KEY:
        raise HTTPException(status_code=500, detail="INTERNAL_API_KEY is not configured on the server.")
    if x_internal_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Internal-Key.")


def load_index() -> SearchIndex | None:
    meta_path = ARTIFACTS_DIR / "engine_meta.json"
    emb_path = ARTIFACTS_DIR / "passage_embeddings.npy"
    passages_path = ARTIFACTS_DIR / "passages.parquet"
    if not (meta_path.exists() and emb_path.exists() and passages_path.exists()):
        return None

    import pandas as pd

    with open(meta_path, encoding="utf-8") as f:
        meta = json.load(f)
    passage_embeddings = np.load(emb_path)
    passages = pd.read_parquet(passages_path)

    return SearchIndex(
        passage_embeddings=passage_embeddings,
        passage_doc_ids=passages["doc_id"].to_numpy(dtype=str),
        doc_titles=meta["doc_titles"],
        doc_areas=meta["doc_areas"],
        doc_courts=meta["doc_courts"],
        doc_years={k: (int(v) if v is not None and v != "None" else None) for k, v in meta["doc_years"].items()},
        doc_urls=meta["doc_urls"],
        advocates_by_doc=meta["advocates_by_doc"],
        model_name=meta["model"],
        threshold=float(meta["threshold"]),
        config=meta["config"],
    )


@app.on_event("startup")
def startup():
    index = load_index()
    _state["index"] = index
    if index is not None:
        _state["embedder"] = Embedder(index.model_name)
    else:
        print("WARNING: no index artifacts found under", ARTIFACTS_DIR, "- /match and /embed will fail until build_index.py has been run.")


@app.get("/health", response_model=HealthResponse)
def health():
    index = _state["index"]
    return HealthResponse(
        ok=True,
        model_loaded=_state["embedder"] is not None,
        index_size=int(index.passage_embeddings.shape[0]) if index is not None else 0,
        threshold=index.threshold if index is not None else None,
    )


@app.post("/match", response_model=MatchResponse, dependencies=[Depends(require_internal_key)])
@limiter.limit("30/minute")
def match(request: Request, payload: MatchRequest):
    index = _state["index"]
    embedder = _state["embedder"]
    if index is None or embedder is None:
        raise HTTPException(status_code=503, detail="Matching index is not loaded. Run build_index.py first.")

    language = detect_language(payload.query)
    if language == "Swahili":
        return MatchResponse(
            language=language,
            unsupported_language=True,
            message="WakiliMatch currently supports English only. Please describe your issue in English.",
        )

    query_embedding = embedder.encode_one(payload.query)
    result = search(query_embedding, index, payload.top_cases, payload.top_lawyers)

    message = None
    if result["no_good_match"]:
        message = "We couldn't find a strong match for this description. Try rephrasing with more detail about your legal issue."

    return MatchResponse(language=language, message=message, **result)


@app.post("/embed", response_model=EmbedResponse, dependencies=[Depends(require_internal_key)])
@limiter.limit("60/minute")
def embed(request: Request, payload: EmbedRequest):
    embedder = _state["embedder"]
    if embedder is None:
        raise HTTPException(status_code=503, detail="Model is not loaded. Run build_index.py first.")
    vectors = embedder.encode(payload.texts)
    return EmbedResponse(embeddings=vectors.tolist(), model=embedder.model_name)
