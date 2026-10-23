from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Credentials(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=256)


class CaseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=4000)


class CasePatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    status: Literal["open", "in_review", "closed"] | None = None


class CaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    description: str
    status: str
    is_demo: bool
    created_at: str
    evidence_count: int = 0
    event_count: int = 0
    finding_count: int = 0


class AnnotationCreate(BaseModel):
    event_id: str | None = None
    text: str = Field(min_length=1, max_length=8000)
    bookmarked: bool = False


class FindingReview(BaseModel):
    status: Literal["unreviewed", "confirmed", "rejected"]
    notes: str = Field(default="", max_length=8000)


class EvidenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    case_id: str
    filename: str
    sha256: str
    size: int
    source: str
    acquired_at: str | None
    status: str
    parser: str
    record_count: int
    duplicate_count: int
    error: str | None
    created_at: str
