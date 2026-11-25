"""FastAPI service exposing the WakiliMatch AI matching engine to Express
only (never the public internet directly) — see brief section 3.3.

Endpoints:
  GET  /health            - model loaded, index size, threshold
  POST /match             - client issue text -> ranked judgments + ranked advocates + xai block
  POST /api/match-lawyers - thin adapter over /match, brief section A4's own {status, xai_explanation, recommendations} shape
  POST /embed             - arbitrary texts -> normalized embeddings (used for lawyer profiles)

Auth: every route except /health requires header X-Internal-Key to match
INTERNAL_API_KEY from the environment. This service must not be exposed
publicly — only Express talks to it.
"""

import json
import os
import sys
from pathlib import Path

import certifi
os.environ["SSL_CERT_FILE"] = certifi.where()

import numpy as np
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

sys.path.insert(0, str(Path(__file__).resolve().parent))

from engine.config import TOP_CASES_DEFAULT, TOP_LAWYERS_DEFAULT
from engine.embedder import Embedder
from engine.retrieval import SearchIndex, search
from engine.validation import STATUS_INFO, classify_match_result, validate_query
from engine.xai import build_xai
from schemas import (
    EmbedRequest, EmbedResponse, HealthResponse, MatchLawyersRequest, MatchLawyersResponse,
    MatchRequest, MatchResponse, RecommendationItem, XaiExplanation,
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


def _run_match(query: str, top_cases: int, top_lawyers: int) -> MatchResponse:
    """Core query->matches pipeline, shared by /match and the brief's
    /api/match-lawyers adapter (section A4) so there is exactly one place
    that validates, searches, and classifies a query."""
    index = _state["index"]
    embedder = _state["embedder"]
    if index is None or embedder is None:
        raise HTTPException(status_code=503, detail="Matching index is not loaded. Run build_index.py first.")

    validation = validate_query(query)
    if validation["status"] != "success":
        return MatchResponse(
            status=validation["status"],
            language=validation["language"],
            unsupported_language=(validation["status"] == "unsupported_language"),
            message=validation["message"],
            example_queries=validation["example_queries"],
        )

    query_embedding = embedder.encode_one(query)
    result = search(query_embedding, index, top_cases, top_lawyers)

    status = classify_match_result(result["no_good_match"], result["advocates"])
    info = STATUS_INFO.get(status)

    return MatchResponse(
        status=status,
        language=validation["language"],
        no_good_match=result["no_good_match"],
        message=info["message"] if info else None,
        example_queries=info["example_queries"] if info else [],
        top_similarity=result["top_similarity"],
        xai=build_xai(result["cases"], index.threshold),
        cases=result["cases"],
        advocates=result["advocates"],
    )


@app.post("/match", response_model=MatchResponse, dependencies=[Depends(require_internal_key)])
@limiter.limit("30/minute")
def match(request: Request, payload: MatchRequest):
    return _run_match(payload.query, payload.top_cases, payload.top_lawyers)


@app.post("/api/match-lawyers", response_model=MatchLawyersResponse, dependencies=[Depends(require_internal_key)])
@limiter.limit("30/minute")
def match_lawyers(request: Request, payload: MatchLawyersRequest):
    """Thin adapter over _run_match(), reshaped to the brief's own example
    contract (section A4). Express keeps using /match directly for the
    richer xai/why blocks; this endpoint exists so the brief's exact
    request/response shape is also available."""
    result = _run_match(payload.user_query, TOP_CASES_DEFAULT, TOP_LAWYERS_DEFAULT)

    xai_explanation = None
    if result.xai is not None:
        xai_explanation = XaiExplanation(
            matched_area=result.xai.matched_area,
            top_precedent=result.xai.top_precedent,
            similarity_score=round(result.top_similarity, 4),
            explanation=result.xai.explanation,
        )

    recommendations = [
        RecommendationItem(
            lawyer=a.name,
            key=a.key,
            match_score=a.match_score,
            case_count=a.relevant_cases,
            example_case=a.example_case,
            practice_areas=a.areas,
        )
        for a in result.advocates
        if not a.ambiguous  # never auto-link a bare-surname match
    ]

    return MatchLawyersResponse(
        status=result.status,
        xai_explanation=xai_explanation,
        recommendations=recommendations,
        message=result.message,
    )


@app.post("/embed", response_model=EmbedResponse, dependencies=[Depends(require_internal_key)])
@limiter.limit("60/minute")
def embed(request: Request, payload: EmbedRequest):
    embedder = _state["embedder"]
    if embedder is None:
        raise HTTPException(status_code=503, detail="Model is not loaded. Run build_index.py first.")
    vectors = embedder.encode(payload.texts)
    return EmbedResponse(embeddings=vectors.tolist(), model=embedder.model_name)
