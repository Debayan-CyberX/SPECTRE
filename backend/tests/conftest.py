import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from alembic import command
from spectre import models as m
from spectre.auth import hasher
from spectre.config import ROOT, settings
from spectre.db import get_db
from spectre.main import app, attempts

HEADERS = {"X-Spectre-Request": "1"}
PASSWORD = "test-only-analyst-password"


@pytest.fixture
def env(tmp_path, monkeypatch):
    engine = create_engine(
        f"sqlite:///{(tmp_path / 'test.db').as_posix()}", connect_args={"check_same_thread": False}
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    config = Config(str(ROOT / "backend/alembic.ini"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")
    sessions = sessionmaker(engine, expire_on_commit=False)
    monkeypatch.setattr(settings, "storage_dir", tmp_path / "evidence")
    monkeypatch.setattr(settings, "max_upload_bytes", 20 * 1024 * 1024)
    attempts.clear()
    with sessions() as db:
        owner = m.User(username="analyst", password_hash=hasher.hash(PASSWORD))
        other = m.User(username="other", password_hash=hasher.hash(PASSWORD))
        db.add_all([owner, other])
        db.commit()

    def override():
        with sessions() as db:
            yield db

    app.dependency_overrides[get_db] = override
    with TestClient(app, headers=HEADERS) as client:
        response = client.post("/api/v1/auth/login", json={"username": "analyst", "password": PASSWORD})
        assert response.status_code == 200
        yield client, sessions
    app.dependency_overrides.clear()
    engine.dispose()


@pytest.fixture
def case(env):
    client, _ = env
    response = client.post(
        "/api/v1/cases", json={"name": "Test investigation", "description": "Disposable fixture"}
    )
    assert response.status_code == 201
    return response.json()["id"]


def upload(client, case_id, content: bytes | str, filename="events.jsonl"):
    return client.post(
        f"/api/v1/cases/{case_id}/evidence",
        content=content,
        headers={"X-Filename": filename, "Content-Type": "application/octet-stream"},
    )
