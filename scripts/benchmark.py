"""Small local benchmark, using a disposable database and the real HTTP import handler."""

import json
import os
import platform
import sys
import tempfile
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

with tempfile.TemporaryDirectory(prefix="spectre-benchmark-") as directory:
    root = Path(directory)
    os.environ.update(
        SPECTRE_DATABASE_URL=f"sqlite:///{(root / 'bench.db').as_posix()}",
        SPECTRE_STORAGE_DIR=str(root / "evidence"),
        SPECTRE_INITIAL_PASSWORD="benchmark-disposable-password",
    )
    from spectre.cli import main

    sys.argv = ["spectre", "init"]
    main()
    from fastapi.testclient import TestClient
    from spectre.main import app

    record_count = 1000
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    payload = "\n".join(
        json.dumps(
            dict(
                timestamp=(start + timedelta(milliseconds=i * 50)).isoformat(),
                host="BENCH-HOST",
                category="file",
                action="created",
                target=f"C:\\Synthetic\\file-{i}.txt",
            )
        )
        for i in range(record_count)
    ).encode()
    with TestClient(app, headers={"X-Spectre-Request": "1"}) as client:
        assert (
            client.post(
                "/api/v1/auth/login",
                json={
                    "username": "analyst",
                    "password": "benchmark-disposable-password",
                },
            ).status_code
            == 200
        )
        case = client.post(
            "/api/v1/cases", json={"name": "Disposable benchmark"}
        ).json()["id"]
        before = time.perf_counter()
        imported = client.post(
            f"/api/v1/cases/{case}/evidence",
            content=payload,
            headers={"X-Filename": "benchmark.jsonl"},
        ).json()
        elapsed = time.perf_counter() - before
        assert imported["status"] == "ready", imported
        before = time.perf_counter()
        response = client.get(f"/api/v1/cases/{case}/events?limit=250")
        query_ms = (time.perf_counter() - before) * 1000
        assert len(response.json()["items"]) == 250
        result = dict(
            record_count=record_count,
            artifact_bytes=len(payload),
            ingestion_seconds=round(elapsed, 3),
            records_per_second=round(record_count / elapsed, 1),
            first_page_250_ms=round(query_ms, 2),
            python=platform.python_version(),
            platform=platform.platform(),
            database="temporary SQLite",
            measured_at=datetime.now(timezone.utc).isoformat(),
            limits="One local run, file-category records, no process graph load. Not an EVTX or production throughput claim.",
        )
        output = Path(__file__).resolve().parents[1] / "docs/benchmark.json"
        output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(result, indent=2))
    from spectre.db import engine

    engine.dispose()
