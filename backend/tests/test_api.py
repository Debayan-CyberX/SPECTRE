import hashlib
import json

from conftest import PASSWORD, upload
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from spectre import models as m
from spectre.config import ROOT, settings
from spectre.main import app


def artifact():
    return (ROOT / "datasets/synthetic/glasshouse.jsonl").read_bytes()


def test_full_evidence_to_report_flow(env, case):
    client, sessions = env
    imported = upload(client, case, artifact())
    assert imported.status_code == 200, imported.text
    evidence = imported.json()
    assert evidence["status"] == "ready", evidence
    assert evidence["sha256"] == hashlib.sha256(artifact()).hexdigest()
    assert evidence["record_count"] == 14
    assert "storage_key" not in evidence
    workspace = client.get(f"/api/v1/cases/{case}/workspace").json()
    assert workspace["case"]["event_count"] == 14
    assert len(workspace["findings"]) == 4
    events = client.get(f"/api/v1/cases/{case}/events?limit=5").json()
    assert len(events["items"]) == 5
    assert "raw" not in events["items"][0]
    page2 = client.get(
        f"/api/v1/cases/{case}/events", params={"cursor": events["next_cursor"], "limit": 5}
    ).json()
    assert not set(e["id"] for e in events["items"]) & set(e["id"] for e in page2["items"])
    event = events["items"][0]
    assert client.get(f"/api/v1/cases/{case}/events/{event['id']}").json()["raw"]
    graph = client.get(f"/api/v1/cases/{case}/graph").json()
    processes = [e for e in graph["entities"] if e["kind"] == "process"]
    assert len(processes) == 6
    assert sum(e["details"]["ancestry"] == "unresolved" for e in processes) == 1
    assert all(r["event_id"] and r["evidence_id"] for r in graph["relationships"])
    assert sum(b["count"] for b in client.get(f"/api/v1/cases/{case}/density").json()["bins"]) == 14
    assert (
        client.post(
            f"/api/v1/cases/{case}/annotations",
            json={"event_id": event["id"], "text": "Needs further review", "bookmarked": True},
        ).status_code
        == 201
    )
    finding = workspace["findings"][0]
    assert (
        client.patch(
            f"/api/v1/cases/{case}/findings/{finding['id']}",
            json={"status": "rejected", "notes": "Alternative explanation"},
        ).json()["status"]
        == "rejected"
    )
    report = client.post(f"/api/v1/cases/{case}/reports", json={}).json()
    first = client.get(f"/api/v1/cases/{case}/reports/{report['id']}")
    second = client.get(f"/api/v1/cases/{case}/reports/{report['id']}")
    assert first.content == second.content
    snapshot = first.json()["snapshot"]
    assert len(snapshot["events"]) == 14 and len(snapshot["annotations"]) == 1
    assert (
        hashlib.sha256(json.dumps(snapshot, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        == report["content_sha256"]
    )
    assert client.get(f"/api/v1/cases/{case}/reports/{report['id']}?format=pdf").content.startswith(b"%PDF")
    download = client.get(f"/api/v1/cases/{case}/evidence/{evidence['id']}/original")
    assert download.content == artifact()
    custody = client.get(f"/api/v1/cases/{case}/evidence/{evidence['id']}").json()["custody"]
    assert [c["action"] for c in custody] == ["imported", "processing_completed", "original_downloaded"]


def test_idempotency_retains_all_source_references(env, case):
    client, sessions = env
    first = upload(client, case, artifact()).json()
    assert upload(client, case, artifact()).json()["id"] == first["id"]
    # Equivalent record, distinct artifact: no duplicated normalized event, extra provenance retained.
    single = artifact().splitlines()[0]
    other = upload(client, case, single, "one.jsonl").json()
    assert other["duplicate_count"] == 1 and other["record_count"] == 0
    with sessions() as db:
        assert db.scalar(select(func.count()).select_from(m.Event)) == 14
        assert db.scalar(select(func.count()).select_from(m.EventSource)) == 15
        assert db.scalar(select(func.count()).select_from(m.Evidence)) == 2


def test_malformed_artifact_retained_and_events_rolled_back(env, case):
    client, sessions = env
    result = upload(client, case, artifact().splitlines()[0] + b"\nthis is not JSON").json()
    assert result["status"] == "failed" and "record 2" in result["error"]
    assert client.get(f"/api/v1/cases/{case}/workspace").json()["case"]["event_count"] == 0
    with sessions() as db:
        row = db.get(m.Evidence, result["id"])
        assert (settings.storage_dir / row.storage_key).is_file()
        assert db.scalar(select(m.Job.status)) == "failed"


def test_upload_allowlist_paths_size_and_empty(env, case, monkeypatch):
    client, _ = env
    for name in ["../events.jsonl", "C:%5Cevents.jsonl", "%2Ftmp%2Fevents.jsonl"]:
        assert upload(client, case, b"{}", name).status_code == 422
    for name in ["log.evtx", "payload.exe", "archive.zip"]:
        assert upload(client, case, b"{}", name).status_code == 415
    assert upload(client, case, b"").status_code == 422
    monkeypatch.setattr(settings, "max_upload_bytes", 20)
    assert upload(client, case, b"x" * 21).status_code == 413
    response = client.post(
        f"/api/v1/cases/{case}/evidence",
        content=iter([b"x" * 10, b"x" * 11]),
        headers={"X-Filename": "events.jsonl"},
    )
    assert response.status_code == 413
    assert not list(settings.storage_dir.glob("*.blob"))


def test_authorization_and_csrf(env, case):
    client, _ = env
    evidence = upload(client, case, artifact()).json()
    events = client.get(f"/api/v1/cases/{case}/events").json()["items"]
    with TestClient(app) as anonymous:
        assert anonymous.get("/api/v1/cases").status_code == 401
        assert anonymous.post("/api/v1/cases", json={"name": "CSRF"}).status_code == 403
        assert anonymous.get(f"/api/v1/cases/{case}/evidence/{evidence['id']}/original").status_code == 401
    assert (
        client.post(
            "/api/v1/cases", json={"name": "Cross origin"}, headers={"Origin": "https://evil.invalid"}
        ).status_code
        == 403
    )
    assert client.post("/api/v1/auth/logout").status_code == 204
    assert client.get("/api/v1/auth/me").status_code == 401
    assert (
        client.post("/api/v1/auth/login", json={"username": "other", "password": PASSWORD}).status_code == 200
    )
    for path in [
        "workspace",
        "events",
        "graph",
        "density",
        f"events/{events[0]['id']}",
        f"evidence/{evidence['id']}",
        f"evidence/{evidence['id']}/original",
        "reports",
    ]:
        assert client.get(f"/api/v1/cases/{case}/{path}").status_code == 404, path
    assert upload(client, case, artifact()).status_code == 404
    assert client.post(f"/api/v1/cases/{case}/reports", json={}).status_code == 404


def test_tampered_original_is_not_downloaded(env, case):
    client, sessions = env
    evidence = upload(client, case, artifact()).json()
    with sessions() as db:
        path = settings.storage_dir / db.get(m.Evidence, evidence["id"]).storage_key
        path.chmod(0o600)
        path.write_bytes(b"changed outside the application")
    assert client.get(f"/api/v1/cases/{case}/evidence/{evidence['id']}/original").status_code == 409


def test_case_edit_and_filter_validation(env, case):
    client, _ = env
    assert (
        client.patch(f"/api/v1/cases/{case}", json={"status": "closed", "name": "Reviewed"}).json()["status"]
        == "closed"
    )
    assert client.post("/api/v1/cases", json={"name": "   "}).status_code == 422
    assert client.get(f"/api/v1/cases/{case}/events?cursor=not-base64").status_code == 422
    assert client.get(f"/api/v1/cases/{case}/events?start=bad").status_code == 422
    assert (
        client.post(
            f"/api/v1/cases/{case}/annotations", json={"event_id": "nonexistent", "text": "wrong reference"}
        ).status_code
        == 404
    )


def test_demo_reimport_runs_real_pipeline_and_private_copies_stay_private(env):
    client, _ = env
    a = client.post("/api/v1/demo/import", json={}).json()
    b = client.post("/api/v1/demo/import", json={}).json()
    assert a["id"] != b["id"]
    assert a["event_count"] == b["event_count"] == 14
    assert client.get("/api/v1/demo").status_code == 503  # No reserved public owner in this disposable DB.


def test_late_parent_artifact_resolves_existing_child_and_preserves_provenance(env, case):
    client, _ = env
    child = dict(
        timestamp="2026-01-01T00:00:02Z",
        host="h",
        EventID=1,
        ProcessGuid="child",
        ParentProcessGuid="parent",
        Image="cmd.exe",
    )
    parent = dict(
        timestamp="2026-01-01T00:00:01Z", host="h", EventID=1, ProcessGuid="parent", Image="WINWORD.EXE"
    )
    upload(client, case, json.dumps(child))
    initial = client.get(f"/api/v1/cases/{case}/graph").json()
    unresolved = next(e for e in initial["entities"] if e["kind"] == "process")
    assert unresolved["details"]["ancestry"] == "unresolved"
    assert not any(edge["kind"] == "spawned" for edge in initial["relationships"])
    upload(client, case, json.dumps(parent), "parent.jsonl")
    graph = client.get(f"/api/v1/cases/{case}/graph").json()
    process = next(e for e in graph["entities"] if e["kind"] == "process" and e["label"] == "cmd.exe")
    assert process["details"]["ancestry"] == "resolved"
    edge = next(r for r in graph["relationships"] if r["kind"] == "spawned")
    assert edge["event_id"] == process["details"]["event_id"]
    assert client.get(f"/api/v1/cases/{case}/workspace").json()["findings"][0]["rule_id"] == "SP-002"


def test_api_reference_is_self_contained_and_derived_from_contract(env):
    client, _ = env
    docs = client.get("/api/docs")
    assert docs.status_code == 200
    assert "/api/v1/cases/{case_id}/evidence" in docs.text
    assert "<script" not in docs.text
    assert client.get("/api/openapi.json").json()["info"]["version"] == "0.1.0"
