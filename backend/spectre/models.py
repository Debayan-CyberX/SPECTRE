import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def uid() -> str:
    return str(uuid.uuid4())


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z")


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    username: Mapped[str] = mapped_column(String(80), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(String(32), default=now)


class Session(Base):
    __tablename__ = "sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    expires_at: Mapped[str] = mapped_column(String(32))


class Case(Base):
    __tablename__ = "investigations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="open")
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[str] = mapped_column(String(32), default=now)


class Evidence(Base):
    __tablename__ = "evidence"
    __table_args__ = (UniqueConstraint("case_id", "sha256"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    case_id: Mapped[str] = mapped_column(ForeignKey("investigations.id"), index=True)
    filename: Mapped[str] = mapped_column(String(240))
    sha256: Mapped[str] = mapped_column(String(64))
    size: Mapped[int] = mapped_column(Integer)
    storage_key: Mapped[str] = mapped_column(String(64))
    source: Mapped[str] = mapped_column(String(200), default="Manual import")
    acquired_at: Mapped[str | None] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(20), default="processing")
    parser: Mapped[str] = mapped_column(String(60), default="spectre-structured/1.0.0")
    record_count: Mapped[int] = mapped_column(Integer, default=0)
    duplicate_count: Mapped[int] = mapped_column(Integer, default=0)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(String(32), default=now)


class Custody(Base):
    __tablename__ = "custody_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    evidence_id: Mapped[str] = mapped_column(ForeignKey("evidence.id"), index=True)
    actor_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(80))
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[str] = mapped_column(String(32), default=now)


class Job(Base):
    __tablename__ = "parsing_jobs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    evidence_id: Mapped[str] = mapped_column(ForeignKey("evidence.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="processing")
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(String(32), default=now)
    finished_at: Mapped[str | None] = mapped_column(String(32))


class Event(Base):
    __tablename__ = "events"
    __table_args__ = (
        UniqueConstraint("case_id", "fingerprint"),
        Index("ix_events_case_time_id", "case_id", "timestamp", "id"),
        Index("ix_events_case_process", "case_id", "process_key"),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    case_id: Mapped[str] = mapped_column(ForeignKey("investigations.id"))
    evidence_id: Mapped[str] = mapped_column(ForeignKey("evidence.id"), index=True)
    fingerprint: Mapped[str] = mapped_column(String(64))
    source_format: Mapped[str] = mapped_column(String(20))
    record_ref: Mapped[str] = mapped_column(String(80))
    original_timestamp: Mapped[str] = mapped_column(String(80))
    timestamp: Mapped[str] = mapped_column(String(32))
    precision: Mapped[str] = mapped_column(String(30))
    host: Mapped[str] = mapped_column(String(255), index=True)
    user: Mapped[str] = mapped_column(String(255), default="Unknown")
    process_key: Mapped[str | None] = mapped_column(String(400))
    parent_key: Mapped[str | None] = mapped_column(String(400))
    category: Mapped[str] = mapped_column(String(40))
    action: Mapped[str] = mapped_column(String(80))
    title: Mapped[str] = mapped_column(String(400))
    fields: Mapped[dict] = mapped_column(JSON)
    raw: Mapped[dict] = mapped_column(JSON)


class EventSource(Base):
    """Keep every source reference when equivalent records occur in multiple artifacts."""

    __tablename__ = "event_sources"
    __table_args__ = (UniqueConstraint("event_id", "evidence_id", "record_ref"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    event_id: Mapped[str] = mapped_column(ForeignKey("events.id"), index=True)
    evidence_id: Mapped[str] = mapped_column(ForeignKey("evidence.id"), index=True)
    record_ref: Mapped[str] = mapped_column(String(80))


class Entity(Base):
    __tablename__ = "entities"
    __table_args__ = (UniqueConstraint("case_id", "kind", "key"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    case_id: Mapped[str] = mapped_column(ForeignKey("investigations.id"), index=True)
    kind: Mapped[str] = mapped_column(String(30))
    key: Mapped[str] = mapped_column(String(600))
    label: Mapped[str] = mapped_column(String(400))
    details: Mapped[dict] = mapped_column(JSON, default=dict)


class Relationship(Base):
    __tablename__ = "relationships"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    case_id: Mapped[str] = mapped_column(ForeignKey("investigations.id"), index=True)
    source_id: Mapped[str] = mapped_column(ForeignKey("entities.id"))
    target_id: Mapped[str] = mapped_column(ForeignKey("entities.id"))
    kind: Mapped[str] = mapped_column(String(60))
    event_id: Mapped[str] = mapped_column(ForeignKey("events.id"))
    evidence_id: Mapped[str] = mapped_column(ForeignKey("evidence.id"))


class DetectionRule(Base):
    __tablename__ = "detection_rules"
    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    version: Mapped[str] = mapped_column(String(20))
    definition: Mapped[dict] = mapped_column(JSON)


class Finding(Base):
    __tablename__ = "findings"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    case_id: Mapped[str] = mapped_column(ForeignKey("investigations.id"), index=True)
    rule_id: Mapped[str] = mapped_column(ForeignKey("detection_rules.id"))
    rule_version: Mapped[str] = mapped_column(String(20), default="1.0.0")
    title: Mapped[str] = mapped_column(String(200))
    severity: Mapped[str] = mapped_column(String(20))
    rationale: Mapped[str] = mapped_column(Text)
    limitations: Mapped[str] = mapped_column(Text)
    mitre: Mapped[str | None] = mapped_column(String(30))
    event_ids: Mapped[list] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(20), default="unreviewed")
    notes: Mapped[str] = mapped_column(Text, default="")


class Annotation(Base):
    __tablename__ = "annotations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    case_id: Mapped[str] = mapped_column(ForeignKey("investigations.id"), index=True)
    event_id: Mapped[str | None] = mapped_column(ForeignKey("events.id"))
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    text: Mapped[str] = mapped_column(Text)
    bookmarked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[str] = mapped_column(String(32), default=now)


class Report(Base):
    __tablename__ = "reports"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    case_id: Mapped[str] = mapped_column(ForeignKey("investigations.id"), index=True)
    snapshot: Mapped[dict] = mapped_column(JSON)
    content_sha256: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[str] = mapped_column(String(32), default=now)


class Audit(Base):
    __tablename__ = "audit_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    case_id: Mapped[str | None] = mapped_column(ForeignKey("investigations.id"), index=True)
    action: Mapped[str] = mapped_column(String(80))
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[str] = mapped_column(String(32), default=now)
