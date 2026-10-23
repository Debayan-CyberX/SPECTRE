import hashlib
import json
import os
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models as m
from .config import settings
from .rules import RULES, detect


def stable(*parts: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "spectre:" + ":".join(parts)))


def as_dict(row, exclude=()) -> dict:
    return {
        column.name: getattr(row, column.name)
        for column in row.__table__.columns
        if column.name not in exclude
    }


def event_dict(row: m.Event, raw: bool = False) -> dict:
    return as_dict(row, () if raw else ("raw", "fingerprint"))


def evidence_dict(row: m.Evidence) -> dict:
    return as_dict(row, ("storage_key",))


def audit(db: Session, actor: str, case: str | None, action: str, **details):
    db.add(m.Audit(actor_id=actor, case_id=case, action=action, details=details))


def derive(db: Session, case_id: str):
    events = list(
        db.scalars(select(m.Event).where(m.Event.case_id == case_id).order_by(m.Event.timestamp, m.Event.id))
    )
    entities = {row.id: row for row in db.scalars(select(m.Entity).where(m.Entity.case_id == case_id))}
    edges = set(db.scalars(select(m.Relationship.id).where(m.Relationship.case_id == case_id)))

    def entity(kind: str, key: str, label: str, details=None):
        identity = stable(case_id, kind, key)
        if identity not in entities:
            row = m.Entity(
                id=identity,
                case_id=case_id,
                kind=kind,
                key=key[:600],
                label=label[:400],
                details=details or {},
            )
            entities[identity] = row
            db.add(row)
        elif details is not None:
            entities[identity].details = details
        return identity

    def link(source: str, target: str, kind: str, event: m.Event):
        identity = stable(event.id, source, target, kind)
        if identity not in edges:
            db.add(
                m.Relationship(
                    id=identity,
                    case_id=case_id,
                    source_id=source,
                    target_id=target,
                    kind=kind,
                    event_id=event.id,
                    evidence_id=event.evidence_id,
                )
            )
            edges.add(identity)

    creations = {
        event.process_key: event for event in events if event.category == "process" and event.process_key
    }
    for key, event in creations.items():
        f = event.fields
        entity(
            "process",
            key,
            str(f.get("image") or "Unknown process").replace("\\", "/").split("/")[-1],
            dict(
                pid=f.get("pid"),
                image=f.get("image"),
                user=event.user,
                host=event.host,
                timestamp=event.timestamp,
                event_id=event.id,
                process_key=key,
                parent_key=event.parent_key,
                ancestry=(
                    "resolved"
                    if event.parent_key in creations
                    and creations[event.parent_key].timestamp <= event.timestamp
                    else "unresolved"
                ),
            ),
        )
    db.flush()
    for event in events:
        host = entity("host", event.host, event.host)
        artifact = entity(
            "evidence", event.evidence_id, "Source artifact", dict(evidence_id=event.evidence_id)
        )
        process = stable(case_id, "process", event.process_key) if event.process_key in creations else None
        if process:
            link(process, host, "executed_on", event)
            link(process, artifact, "supported_by", event)
            if event.user != "Unknown":
                user = entity("identity", event.user, event.user)
                link(process, user, "associated_with", event)
            parent = creations.get(event.parent_key)
            if event.category == "process" and parent and parent.timestamp <= event.timestamp:
                link(stable(case_id, "process", event.parent_key), process, "spawned", event)
            if event.category == "network" and event.fields.get("destination"):
                key = f"{event.fields['destination']}:{event.fields.get('port') or '?'}"
                endpoint = entity("endpoint", key, key)
                link(process, endpoint, "connected_to", event)
            if event.category == "file" and event.fields.get("target"):
                file = entity("file", str(event.fields["target"]), str(event.fields["target"]))
                link(process, file, "created_file", event)
    db.flush()
    for rule_id, definition in RULES.items():
        if not db.get(m.DetectionRule, rule_id):
            db.add(m.DetectionRule(id=rule_id, version="1.0.0", definition=definition))
    db.flush()
    for match in detect([event_dict(event) for event in events]):
        identity = stable(case_id, match["rule_id"], *match["event_ids"])
        if not db.get(m.Finding, identity):
            db.add(
                m.Finding(
                    id=identity,
                    case_id=case_id,
                    **{key: value for key, value in match.items() if key != "required_fields"},
                )
            )


def process_evidence(db: Session, evidence: m.Evidence, actor: str):
    evidence_id, case_id = evidence.id, evidence.case_id
    job = db.scalar(select(m.Job).where(m.Job.evidence_id == evidence_id).order_by(m.Job.created_at.desc()))
    path = settings.storage_dir / evidence.storage_key
    descriptor, result_path = tempfile.mkstemp(prefix="parsed-", suffix=".jsonl", dir=settings.storage_dir)
    os.close(descriptor)
    try:
        result = subprocess.run(
            [
                sys.executable,
                "-m",
                "spectre.parser",
                str(path),
                Path(evidence.filename).suffix.lower(),
                result_path,
            ],
            capture_output=True,
            text=True,
            timeout=settings.parser_timeout,
            cwd=str(Path(__file__).parents[1]),
            env={
                **{
                    key: value
                    for key, value in os.environ.items()
                    if key.upper() in {"SYSTEMROOT", "WINDIR", "PATH", "TEMP", "TMP", "LANG"}
                },
                "PYTHONIOENCODING": "utf-8",
            },
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
        if result.returncode:
            raise ValueError(result.stderr[:600] or "Parser rejected this artifact")
        from sqlalchemy import func

        count = db.scalar(select(func.count()).select_from(m.Event).where(m.Event.case_id == case_id))
        if count >= 20_000:
            raise ValueError(
                "Initial local release supports 20,000 events per case; create a separate investigation"
            )
        seen = {
            row.fingerprint: row.id for row in db.scalars(select(m.Event).where(m.Event.case_id == case_id))
        }
        accepted, duplicates = 0, 0
        with open(result_path, encoding="utf-8") as parsed:
            for line in parsed:
                data = json.loads(line)
                fingerprint = data["fingerprint"]
                if fingerprint in seen:
                    event_id = seen[fingerprint]
                    duplicates += 1
                else:
                    if count + accepted >= 20_000:
                        raise ValueError("Case would exceed the initial 20,000-event limit")
                    event_id = stable(case_id, fingerprint)
                    seen[fingerprint] = event_id
                    db.add(m.Event(id=event_id, case_id=case_id, evidence_id=evidence_id, **data))
                    accepted += 1
                db.flush()  # Source FK must refer to the event; writes remain in one transaction.
                if not db.scalar(
                    select(m.EventSource.id).where(
                        m.EventSource.event_id == event_id,
                        m.EventSource.evidence_id == evidence_id,
                        m.EventSource.record_ref == data["record_ref"],
                    )
                ):
                    db.add(
                        m.EventSource(
                            event_id=event_id, evidence_id=evidence_id, record_ref=data["record_ref"]
                        )
                    )
        derive(db, case_id)
        evidence.status, evidence.record_count, evidence.duplicate_count = "ready", accepted, duplicates
        job.status, job.finished_at = "completed", m.now()
        db.add(
            m.Custody(
                evidence_id=evidence_id,
                actor_id=actor,
                action="processing_completed",
                details=dict(parser=evidence.parser, events=accepted, duplicates=duplicates),
            )
        )
        audit(db, actor, case_id, "evidence.processed", evidence_id=evidence_id, events=accepted)
        db.commit()
    except Exception as error:
        db.rollback()
        evidence = db.get(m.Evidence, evidence_id)
        job = db.get(m.Job, job.id)
        message = (
            "Parser exceeded processing deadline"
            if isinstance(error, subprocess.TimeoutExpired)
            else (
                str(error)[:600]
                if isinstance(error, ValueError)
                else "Processing failed; original retained for inspection"
            )
        )
        evidence.status, evidence.error = "failed", message
        job.status, job.error, job.finished_at = "failed", message, m.now()
        db.add(
            m.Custody(
                evidence_id=evidence_id,
                actor_id=actor,
                action="processing_failed",
                details=dict(error=message),
            )
        )
        db.commit()
    finally:
        Path(result_path).unlink(missing_ok=True)
    return db.get(m.Evidence, evidence_id)


def ingest_local(db: Session, case_id: str, actor: str, source: Path):
    """Synthetic fixtures use the same original storage, subprocess parser and derivation path."""
    identity = m.uid()
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    target = settings.storage_dir / f"{identity}.blob"
    digest = hashlib.sha256()
    size = 0
    with source.open("rb") as incoming, target.open("xb") as outgoing:
        while block := incoming.read(64 * 1024):
            digest.update(block)
            size += len(block)
            outgoing.write(block)
    existing = db.scalar(
        select(m.Evidence).where(m.Evidence.case_id == case_id, m.Evidence.sha256 == digest.hexdigest())
    )
    if existing:
        target.unlink()
        return existing
    target.chmod(0o444)
    evidence = m.Evidence(
        id=identity,
        case_id=case_id,
        filename=source.name,
        storage_key=target.name,
        size=size,
        sha256=digest.hexdigest(),
        source="SPECTRE synthetic dataset v1",
    )
    db.add(evidence)
    db.flush()
    db.add_all(
        [
            m.Job(evidence_id=identity),
            m.Custody(
                evidence_id=identity,
                actor_id=actor,
                action="imported",
                details=dict(sha256=digest.hexdigest(), size=size),
            ),
        ]
    )
    db.commit()
    return process_evidence(db, evidence, actor)
