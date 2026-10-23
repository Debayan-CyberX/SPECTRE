import base64
import hashlib
import io
import json
import logging
import re
import secrets
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import unquote
from xml.sax.saxutils import escape

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse, HTMLResponse
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from . import models as m
from .auth import DUMMY_HASH, current_user, token_hash, verify
from .config import ROOT, settings
from .db import get_db
from .schemas import AnnotationCreate, CaseCreate, CaseOut, CasePatch, Credentials, EvidenceOut, FindingReview
from .services import as_dict, audit, event_dict, evidence_dict, ingest_local, process_evidence

app = FastAPI(
    title="SPECTRE Investigation API",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
    openapi_url="/api/openapi.json",
)
log = logging.getLogger("spectre")
logging.basicConfig(level=logging.INFO, format="%(message)s")
attempts: dict[str, deque] = defaultdict(deque)
attempt_lock = threading.Lock()
ingestion_lock = threading.Lock()  # Bounded initial release: one derivation transaction at a time.


@app.get("/api/docs", response_class=HTMLResponse, include_in_schema=False)
def api_reference():
    schema = app.openapi()
    endpoints = []
    for path, methods in schema["paths"].items():
        for method, operation in methods.items():
            endpoints.append(
                f"<details><summary><b>{escape(method.upper())}</b> {escape(path)}"
                f" — {escape(operation.get('summary', ''))}</summary><pre>"
                f"{escape(json.dumps(operation, indent=2))}</pre></details>"
            )
    return (
        '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">'
        "<title>SPECTRE / API reference</title><style>body{background:#080b10;color:#cbdbe7;font:14px monospace;"
        "max-width:1100px;margin:50px auto;padding:20px}a,b{color:#88d8e3}details{border-top:1px solid #304252;"
        "padding:18px 0}summary{cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}"
        "p{line-height:1.8}</style><main><h1>SPECTRE / API v1</h1><p>Local, read-only API reference. "
        "Private endpoints require a session. Mutations require X-Spectre-Request: 1.</p>"
        '<p><a href="/api/openapi.json">Download OpenAPI schema</a></p>'
        + "".join(endpoints)
        + "</main></html>"
    )


@app.middleware("http")
async def security_boundary(request: Request, call_next):
    start = time.perf_counter()
    request_id = secrets.token_hex(8)
    if request.method in {"POST", "PATCH", "PUT", "DELETE"}:
        origin = request.headers.get("origin")
        if request.headers.get("x-spectre-request") != "1" or (origin and origin != settings.allowed_origin):
            return Response(
                '{"detail":"Request origin or CSRF header rejected"}',
                status_code=403,
                media_type="application/json",
            )
        # Raw uploads are checked per chunk, before writing. Bound JSON bodies before FastAPI parses them.
        if not request.url.path.endswith("/evidence"):
            body = bytearray()
            async for block in request.stream():
                body.extend(block)
                if len(body) > 128 * 1024:
                    return Response(
                        '{"detail":"Request body too large"}', status_code=413, media_type="application/json"
                    )
            request._body = bytes(body)
    response = await call_next(request)
    response.headers.update(
        {"X-Content-Type-Options": "nosniff", "Cache-Control": "no-store", "X-Request-ID": request_id}
    )
    # Never log request bodies, filenames, queries, cookies or artifact content.
    log.info(
        json.dumps(
            dict(
                request_id=request_id,
                method=request.method,
                status=response.status_code,
                elapsed_ms=round((time.perf_counter() - start) * 1000, 2),
            )
        )
    )
    return response


def owned_case(db: Session, identity: str, user: m.User):
    case = db.get(m.Case, identity)
    if not case or case.owner_id != user.id:
        raise HTTPException(404, "Investigation not found")
    return case


def case_dict(db: Session, case: m.Case):
    return {
        **as_dict(case, ("owner_id",)),
        **{
            name: db.scalar(select(func.count()).select_from(model).where(model.case_id == case.id))
            for name, model in [
                ("evidence_count", m.Evidence),
                ("event_count", m.Event),
                ("finding_count", m.Finding),
            ]
        },
    }


@app.get("/api/v1/health")
def health(db: Session = Depends(get_db)):
    db.execute(select(m.User.id).limit(1))
    return {"status": "ok", "version": "0.1.0", "parser": "spectre-structured/1.0.0"}


@app.post("/api/v1/auth/login")
def login(data: Credentials, request: Request, response: Response, db: Session = Depends(get_db)):
    address = request.client.host if request.client else "local"
    with attempt_lock:
        if len(attempts) > 1000:
            attempts.clear()
        recent = attempts[address]
        while recent and recent[0] < time.monotonic() - 60:
            recent.popleft()
        if len(recent) >= 10:
            raise HTTPException(429, "Too many login attempts. Try again in one minute.")
        recent.append(time.monotonic())
    user = db.scalar(select(m.User).where(m.User.username == data.username))
    valid = verify(data.password, user.password_hash if user else DUMMY_HASH)
    if not user or not valid or user.username.startswith("__"):
        raise HTTPException(401, "Invalid username or password")
    token = secrets.token_urlsafe(48)
    expires = (
        (datetime.now(timezone.utc) + timedelta(hours=settings.session_hours))
        .isoformat(timespec="microseconds")
        .replace("+00:00", "Z")
    )
    db.add(m.Session(token_hash=token_hash(token), user_id=user.id, expires_at=expires))
    audit(db, user.id, None, "session.created")
    db.commit()
    response.set_cookie(
        "spectre_session",
        token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
        max_age=settings.session_hours * 3600,
        path="/",
    )
    return {"id": user.id, "username": user.username}


@app.get("/api/v1/auth/me")
def me(user: m.User = Depends(current_user)):
    return {"id": user.id, "username": user.username}


@app.post("/api/v1/auth/logout", status_code=204)
def logout(
    request: Request, response: Response, user: m.User = Depends(current_user), db: Session = Depends(get_db)
):
    session = db.get(m.Session, token_hash(request.cookies.get("spectre_session", "")))
    if session:
        db.delete(session)
    audit(db, user.id, None, "session.deleted")
    db.commit()
    response.delete_cookie("spectre_session", path="/")


@app.get("/api/v1/cases", response_model=list[CaseOut])
def cases(user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    return [
        case_dict(db, case)
        for case in db.scalars(
            select(m.Case).where(m.Case.owner_id == user.id).order_by(m.Case.created_at.desc())
        )
    ]


@app.post("/api/v1/cases", response_model=CaseOut, status_code=201)
def create_case(data: CaseCreate, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    if not data.name.strip():
        raise HTTPException(422, "Investigation name cannot be blank")
    case = m.Case(owner_id=user.id, name=data.name.strip(), description=data.description)
    db.add(case)
    db.flush()
    audit(db, user.id, case.id, "case.created")
    db.commit()
    return case_dict(db, case)


@app.patch("/api/v1/cases/{case_id}", response_model=CaseOut)
def update_case(
    case_id: str, data: CasePatch, user: m.User = Depends(current_user), db: Session = Depends(get_db)
):
    case = owned_case(db, case_id, user)
    for key, value in data.model_dump(exclude_none=True).items():
        if key == "name" and not value.strip():
            raise HTTPException(422, "Investigation name cannot be blank")
        setattr(case, key, value.strip() if key == "name" else value)
    audit(db, user.id, case.id, "case.updated", fields=list(data.model_fields_set))
    db.commit()
    return case_dict(db, case)


@app.post("/api/v1/demo/import", response_model=CaseOut, status_code=201)
def import_demo(user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    with ingestion_lock:
        case = m.Case(
            owner_id=user.id,
            name="Operation Glasshouse",
            is_demo=True,
            description="Synthetic exercise · suspicious document execution on FIN-WS-042. No real employee or endpoint data.",
        )
        db.add(case)
        db.commit()
        ingest_local(db, case.id, user.id, ROOT / "datasets/synthetic/glasshouse.jsonl")
        audit(db, user.id, case.id, "demo.imported")
        db.commit()
    return case_dict(db, case)


def workspace(db: Session, case: m.Case):
    categories = db.execute(
        select(m.Event.category, func.count()).where(m.Event.case_id == case.id).group_by(m.Event.category)
    ).all()
    bounds = db.execute(
        select(func.min(m.Event.timestamp), func.max(m.Event.timestamp)).where(m.Event.case_id == case.id)
    ).one()
    return dict(
        case=case_dict(db, case),
        evidence=[
            evidence_dict(e)
            for e in db.scalars(
                select(m.Evidence).where(m.Evidence.case_id == case.id).order_by(m.Evidence.created_at.desc())
            )
        ],
        findings=[
            as_dict(f)
            for f in db.scalars(select(m.Finding).where(m.Finding.case_id == case.id).order_by(m.Finding.id))
        ],
        annotations=[
            as_dict(a)
            for a in db.scalars(
                select(m.Annotation).where(m.Annotation.case_id == case.id).order_by(m.Annotation.created_at)
            )
        ],
        jobs=[
            as_dict(j)
            for j in db.scalars(select(m.Job).join(m.Evidence).where(m.Evidence.case_id == case.id))
        ],
        hosts=list(db.scalars(select(m.Event.host).where(m.Event.case_id == case.id).distinct())),
        users=list(db.scalars(select(m.Event.user).where(m.Event.case_id == case.id).distinct())),
        categories=dict(categories),
        start=bounds[0],
        end=bounds[1],
    )


@app.get("/api/v1/cases/{case_id}/workspace")
def get_workspace(case_id: str, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    return workspace(db, owned_case(db, case_id, user))


@app.get("/api/v1/demo")
def public_demo(db: Session = Depends(get_db)):
    # Public data can ONLY belong to the reserved, unloginable synthetic owner.
    case = db.scalar(
        select(m.Case)
        .join(m.User, m.User.id == m.Case.owner_id)
        .where(m.User.username == "__public_demo__", m.Case.is_demo.is_(True))
    )
    if not case:
        raise HTTPException(503, "Synthetic case is not initialized. Run python -m spectre.cli init.")
    data = workspace(db, case)
    data["events"] = [
        event_dict(e)
        for e in db.scalars(
            select(m.Event)
            .where(m.Event.case_id == case.id)
            .order_by(m.Event.timestamp, m.Event.id)
            .limit(100)
        )
    ]
    data["entities"] = [
        as_dict(e) for e in db.scalars(select(m.Entity).where(m.Entity.case_id == case.id).limit(150))
    ]
    data["relationships"] = [
        as_dict(r)
        for r in db.scalars(select(m.Relationship).where(m.Relationship.case_id == case.id).limit(500))
    ]
    return data


@app.post("/api/v1/cases/{case_id}/evidence", response_model=EvidenceOut)
async def upload(
    case_id: str, request: Request, user: m.User = Depends(current_user), db: Session = Depends(get_db)
):
    owned_case(db, case_id, user)
    filename = unquote(request.headers.get("x-filename", ""))
    if (
        not filename
        or len(filename) > 240
        or re.search(r"[\\/\x00-\x1f\x7f]", filename)
        or filename in {".", ".."}
    ):
        raise HTTPException(422, "Supply a filename without path separators or control characters")
    if Path(filename).suffix.lower() not in {".json", ".jsonl", ".csv"}:
        raise HTTPException(
            415, "Supported: .json, .jsonl, .csv. Binary EVTX is not supported in this release."
        )
    source = unquote(request.headers.get("x-evidence-source", "Manual import"))[:200]
    acquired = request.headers.get("x-acquired-at")
    if acquired:
        from .parser import timestamp

        try:
            timestamp(acquired)
        except ValueError:
            raise HTTPException(422, "Acquisition timestamp requires an ISO 8601 UTC offset") from None
    try:
        declared_size = int(request.headers.get("content-length", "0"))
    except ValueError:
        raise HTTPException(422, "Invalid Content-Length header") from None
    if declared_size > settings.max_upload_bytes:
        raise HTTPException(413, "Artifact exceeds the 20 MiB import limit")
    identity = m.uid()
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    path = settings.storage_dir / f"{identity}.blob"
    digest, size = hashlib.sha256(), 0
    try:
        with path.open("xb") as output:
            async for chunk in request.stream():
                size += len(chunk)
                if size > settings.max_upload_bytes:
                    raise HTTPException(413, "Artifact exceeds the 20 MiB import limit")
                digest.update(chunk)
                output.write(chunk)
        if not size:
            raise HTTPException(422, "Artifact is empty")
    except BaseException:
        path.unlink(missing_ok=True)
        raise

    def finalize():
        with ingestion_lock:
            existing = db.scalar(
                select(m.Evidence).where(
                    m.Evidence.case_id == case_id, m.Evidence.sha256 == digest.hexdigest()
                )
            )
            if existing:
                path.unlink()
                db.add(
                    m.Custody(
                        evidence_id=existing.id,
                        actor_id=user.id,
                        action="duplicate_import_skipped",
                        details=dict(sha256=existing.sha256),
                    )
                )
                db.commit()
                return evidence_dict(existing)
            path.chmod(0o444)
            evidence = m.Evidence(
                id=identity,
                case_id=case_id,
                filename=filename,
                size=size,
                sha256=digest.hexdigest(),
                storage_key=path.name,
                source=source,
                acquired_at=acquired,
            )
            db.add(evidence)
            db.flush()
            db.add_all(
                [
                    m.Job(evidence_id=identity),
                    m.Custody(
                        evidence_id=identity,
                        actor_id=user.id,
                        action="imported",
                        details=dict(sha256=digest.hexdigest(), size=size),
                    ),
                ]
            )
            audit(db, user.id, case_id, "evidence.imported", evidence_id=identity)
            db.commit()
            return evidence_dict(process_evidence(db, evidence, user.id))

    return await run_in_threadpool(finalize)


@app.get("/api/v1/cases/{case_id}/evidence/{evidence_id}")
def evidence_detail(
    case_id: str, evidence_id: str, user: m.User = Depends(current_user), db: Session = Depends(get_db)
):
    owned_case(db, case_id, user)
    evidence = db.get(m.Evidence, evidence_id)
    if not evidence or evidence.case_id != case_id:
        raise HTTPException(404, "Evidence not found")
    return {
        **evidence_dict(evidence),
        "custody": [
            as_dict(c)
            for c in db.scalars(
                select(m.Custody)
                .where(m.Custody.evidence_id == evidence_id)
                .order_by(m.Custody.created_at, m.Custody.id)
            )
        ],
    }


@app.get("/api/v1/cases/{case_id}/evidence/{evidence_id}/original")
def original(
    case_id: str, evidence_id: str, user: m.User = Depends(current_user), db: Session = Depends(get_db)
):
    owned_case(db, case_id, user)
    evidence = db.get(m.Evidence, evidence_id)
    if not evidence or evidence.case_id != case_id:
        raise HTTPException(404, "Evidence not found")
    path = settings.storage_dir / evidence.storage_key
    if not path.is_file():
        raise HTTPException(409, "Original evidence is missing from storage")
    with path.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    if digest != evidence.sha256:
        audit(db, user.id, case_id, "evidence.integrity_failed", evidence_id=evidence_id)
        db.commit()
        raise HTTPException(409, "Integrity check failed: original differs from its import hash")
    db.add(
        m.Custody(
            evidence_id=evidence_id,
            actor_id=user.id,
            action="original_downloaded",
            details=dict(sha256=digest),
        )
    )
    db.commit()
    return FileResponse(path, media_type="application/octet-stream", filename=evidence.filename)


@app.get("/api/v1/cases/{case_id}/events")
def events(
    case_id: str,
    limit: int = Query(250, ge=1, le=500),
    cursor: str | None = None,
    category: str | None = None,
    host: str | None = None,
    user_filter: str | None = Query(None, alias="user"),
    q: str = Query("", max_length=200),
    start: str | None = None,
    end: str | None = None,
    user: m.User = Depends(current_user),
    db: Session = Depends(get_db),
):
    owned_case(db, case_id, user)
    query = select(m.Event).where(m.Event.case_id == case_id)
    for column, value in [(m.Event.category, category), (m.Event.host, host), (m.Event.user, user_filter)]:
        if value:
            query = query.where(column == value)
    if q:
        query = query.where(
            or_(m.Event.title.ilike(f"%{q}%", escape="!"), m.Event.host.ilike(f"%{q}%", escape="!"))
        )
    from .parser import timestamp

    try:
        if start:
            query = query.where(m.Event.timestamp >= timestamp(start)[0])
        if end:
            query = query.where(m.Event.timestamp <= timestamp(end)[0])
        if cursor:
            previous_time, previous_id = base64.urlsafe_b64decode(cursor.encode()).decode().split("|", 1)
            query = query.where(
                or_(
                    m.Event.timestamp > previous_time,
                    and_(m.Event.timestamp == previous_time, m.Event.id > previous_id),
                )
            )
    except (ValueError, TypeError):
        raise HTTPException(422, "Invalid time range or pagination cursor") from None
    result = list(db.scalars(query.order_by(m.Event.timestamp, m.Event.id).limit(limit + 1)))
    page = result[:limit]
    next_cursor = (
        base64.urlsafe_b64encode(f"{page[-1].timestamp}|{page[-1].id}".encode()).decode()
        if len(result) > limit
        else None
    )
    return {"items": [event_dict(e) for e in page], "next_cursor": next_cursor}


@app.get("/api/v1/cases/{case_id}/density")
def density(
    case_id: str,
    bins: int = Query(48, ge=8, le=128),
    user: m.User = Depends(current_user),
    db: Session = Depends(get_db),
):
    owned_case(db, case_id, user)
    # SQL aggregates; the browser never receives the full dataset for density rendering.
    lo, hi = db.execute(
        select(func.min(m.Event.timestamp), func.max(m.Event.timestamp)).where(m.Event.case_id == case_id)
    ).one()
    if not lo:
        return {"bins": [], "start": None, "end": None}
    start_dt, end_dt = (
        datetime.fromisoformat(lo.replace("Z", "+00:00")),
        datetime.fromisoformat(hi.replace("Z", "+00:00")),
    )
    step = max((end_dt - start_dt).total_seconds(), 1) / bins
    output = []
    for i in range(bins):
        a = (start_dt + timedelta(seconds=step * i)).isoformat(timespec="microseconds").replace("+00:00", "Z")
        b = (
            (start_dt + timedelta(seconds=step * (i + 1)))
            .isoformat(timespec="microseconds")
            .replace("+00:00", "Z")
        )
        count = db.scalar(
            select(func.count())
            .select_from(m.Event)
            .where(
                m.Event.case_id == case_id,
                m.Event.timestamp >= a,
                m.Event.timestamp <= b if i == bins - 1 else m.Event.timestamp < b,
            )
        )
        output.append({"timestamp": a, "count": count})
    return {"bins": output, "start": lo, "end": hi}


@app.get("/api/v1/cases/{case_id}/events/{event_id}")
def event_detail(
    case_id: str, event_id: str, user: m.User = Depends(current_user), db: Session = Depends(get_db)
):
    owned_case(db, case_id, user)
    event = db.get(m.Event, event_id)
    if not event or event.case_id != case_id:
        raise HTTPException(404, "Event not found")
    return {
        **event_dict(event, raw=True),
        "sources": [
            as_dict(s) for s in db.scalars(select(m.EventSource).where(m.EventSource.event_id == event_id))
        ],
    }


@app.get("/api/v1/cases/{case_id}/graph")
def graph(
    case_id: str, kind: str | None = None, user: m.User = Depends(current_user), db: Session = Depends(get_db)
):
    owned_case(db, case_id, user)
    query = select(m.Entity).where(m.Entity.case_id == case_id)
    if kind:
        query = query.where(m.Entity.kind == kind)
    entities = list(db.scalars(query.order_by(m.Entity.kind, m.Entity.label, m.Entity.id).limit(151)))
    selected = entities[:150]
    identities = [e.id for e in selected]
    relationships = list(
        db.scalars(
            select(m.Relationship)
            .where(
                m.Relationship.case_id == case_id,
                m.Relationship.source_id.in_(identities),
                m.Relationship.target_id.in_(identities),
            )
            .order_by(m.Relationship.id)
            .limit(501)
        )
    )
    return {
        "entities": [as_dict(e) for e in selected],
        "relationships": [as_dict(r) for r in relationships[:500]],
        "truncated": len(entities) > 150 or len(relationships) > 500,
    }


@app.post("/api/v1/cases/{case_id}/annotations", status_code=201)
def annotate(
    case_id: str, data: AnnotationCreate, user: m.User = Depends(current_user), db: Session = Depends(get_db)
):
    owned_case(db, case_id, user)
    if data.event_id:
        event = db.get(m.Event, data.event_id)
        if not event or event.case_id != case_id:
            raise HTTPException(404, "Event not found in this investigation")
    note = m.Annotation(case_id=case_id, author_id=user.id, **data.model_dump())
    db.add(note)
    audit(db, user.id, case_id, "annotation.created", event_id=data.event_id)
    db.commit()
    return as_dict(note)


@app.patch("/api/v1/cases/{case_id}/findings/{finding_id}")
def review(
    case_id: str,
    finding_id: str,
    data: FindingReview,
    user: m.User = Depends(current_user),
    db: Session = Depends(get_db),
):
    owned_case(db, case_id, user)
    finding = db.get(m.Finding, finding_id)
    if not finding or finding.case_id != case_id:
        raise HTTPException(404, "Finding not found")
    finding.status, finding.notes = data.status, data.notes
    audit(db, user.id, case_id, "finding.reviewed", finding_id=finding_id, status=data.status)
    db.commit()
    return as_dict(finding)


@app.post("/api/v1/cases/{case_id}/reports", status_code=201)
def create_report(case_id: str, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    case = owned_case(db, case_id, user)
    snapshot = workspace(db, case)
    evidence_ids = [e["id"] for e in snapshot["evidence"]]
    snapshot.update(
        schema_version="1.0",
        exported_at=m.now(),
        analyst=user.username,
        events=[
            event_dict(e)
            for e in db.scalars(
                select(m.Event).where(m.Event.case_id == case_id).order_by(m.Event.timestamp, m.Event.id)
            )
        ],
        custody=[
            as_dict(c)
            for c in db.scalars(
                select(m.Custody)
                .where(m.Custody.evidence_id.in_(evidence_ids))
                .order_by(m.Custody.created_at, m.Custody.id)
            )
        ],
        event_sources=[
            as_dict(s)
            for s in db.scalars(
                select(m.EventSource)
                .where(m.EventSource.evidence_id.in_(evidence_ids))
                .order_by(m.EventSource.id)
            )
        ],
        rules={
            key: {"version": "1.0.0", **rule}
            for key, rule in __import__("spectre.rules", fromlist=["RULES"]).RULES.items()
        },
        limitations=[
            "Rule matches are investigative leads, not established malicious activity.",
            "Structured JSON/JSONL/CSV only; EVTX binary parsing is not implemented.",
            "Original artifacts remain untrusted. Application custody history is not tamper-proof storage.",
            "UTC timestamps preserve offsets in original_timestamp; sub-microsecond precision is truncated in normalized time.",
            "PDF timeline contains the first 100 events; JSON includes every stored event.",
        ],
    )
    digest = hashlib.sha256(json.dumps(snapshot, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    report = m.Report(case_id=case_id, snapshot=snapshot, content_sha256=digest)
    db.add(report)
    audit(db, user.id, case_id, "report.created", content_sha256=digest)
    db.commit()
    return as_dict(report, ("snapshot",))


@app.get("/api/v1/cases/{case_id}/reports")
def list_reports(case_id: str, user: m.User = Depends(current_user), db: Session = Depends(get_db)):
    owned_case(db, case_id, user)
    return [
        as_dict(r, ("snapshot",))
        for r in db.scalars(
            select(m.Report).where(m.Report.case_id == case_id).order_by(m.Report.created_at.desc())
        )
    ]


@app.get("/api/v1/cases/{case_id}/reports/{report_id}")
def download_report(
    case_id: str,
    report_id: str,
    format: str = Query("json", pattern="^(json|pdf)$"),
    user: m.User = Depends(current_user),
    db: Session = Depends(get_db),
):
    owned_case(db, case_id, user)
    report = db.get(m.Report, report_id)
    if not report or report.case_id != case_id:
        raise HTTPException(404, "Report not found")
    audit(db, user.id, case_id, "report.downloaded", report_id=report_id, format=format)
    db.commit()
    headers = {"Content-Disposition": f'attachment; filename="spectre-{report_id}.{format}"'}
    if format == "json":
        return Response(
            json.dumps(
                {**as_dict(report, ("snapshot",)), "snapshot": report.snapshot}, indent=2, ensure_ascii=False
            ),
            media_type="application/json",
            headers=headers,
        )
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

    output = io.BytesIO()
    styles = getSampleStyleSheet()
    story = []

    def paragraph(text, style="BodyText"):
        story.append(Paragraph(escape(str(text)), styles[style]))
        story.append(Spacer(1, 6))

    snap = report.snapshot
    paragraph("SPECTRE / Investigation report", "Title")
    paragraph(snap["case"]["name"], "Heading1")
    paragraph(f"Case {case_id} | Exported {snap['exported_at']} | Analyst {snap['analyst']}")
    paragraph(f"Snapshot SHA-256: {report.content_sha256}")
    paragraph(snap["case"]["description"])
    for heading, items in [
        (
            "Evidence inventory",
            [
                f"{e['filename']} | {e['size']} bytes | {e['status']} | {e['parser']} | ID {e['id']} | SHA-256 {e['sha256']}"
                for e in snap["evidence"]
            ],
        ),
        (
            "Custody history",
            [
                f"{c['created_at']} | {c['action']} | Evidence {c['evidence_id']} | Actor {c['actor_id']} | {json.dumps(c['details'])}"
                for c in snap["custody"]
            ],
        ),
        (
            "Findings",
            [
                f"{f['rule_id']} v{f['rule_version']} | {f['title']} | {f['status']} | {f['rationale']} Limitations: {f['limitations']} Events: {', '.join(f['event_ids'])}. Analyst notes: {f['notes']}"
                for f in snap["findings"]
            ],
        ),
        (
            "Timeline (first 100 events)",
            [
                f"{e['timestamp']} | {e['title']} | Host {e['host']} | Event {e['id']} | Evidence {e['evidence_id']} record {e['record_ref']}"
                for e in snap["events"][:100]
            ],
        ),
        (
            "Analyst notes",
            [f"{a['created_at']} | Event {a['event_id']} | {a['text']}" for a in snap["annotations"]],
        ),
        ("Known limitations", snap["limitations"]),
    ]:
        paragraph(heading, "Heading2")
        for item in items:
            paragraph(item)
    SimpleDocTemplate(output, title="SPECTRE Investigation Report").build(story)
    return Response(output.getvalue(), media_type="application/pdf", headers=headers)
