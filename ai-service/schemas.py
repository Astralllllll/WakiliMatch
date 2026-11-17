"""Pydantic request/response models for the AI service's HTTP contract
(brief section 3.3)."""

from pydantic import BaseModel, Field


class MatchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4000)
    top_cases: int = Field(default=20, ge=1, le=50)
    top_lawyers: int = Field(default=10, ge=1, le=30)


class CaseResult(BaseModel):
    doc_id: str
    title: str | None = None
    court: str | None = None
    year: int | None = None
    area: str | None = None
    similarity: float
    url: str | None = None


class CaseEvidence(BaseModel):
    doc_id: str
    case: str | None = None
    score: float


class AdvocateResult(BaseModel):
    name: str
    key: str
    match_score: float
    relevant_cases: int
    example_case: str | None = None
    areas: str | None = None
    evidence: list[CaseEvidence] = []


class MatchResponse(BaseModel):
    language: str
    unsupported_language: bool = False
    no_good_match: bool = False
    top_similarity: float = 0.0
    message: str | None = None
    cases: list[CaseResult] = []
    advocates: list[AdvocateResult] = []


class EmbedRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=256)


class EmbedResponse(BaseModel):
    embeddings: list[list[float]]
    model: str


class HealthResponse(BaseModel):
    ok: bool
    model_loaded: bool
    index_size: int
    threshold: float | None = None
