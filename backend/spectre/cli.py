import argparse
import getpass
import secrets

from alembic.config import Config
from sqlalchemy import select

from alembic import command

from . import models as m
from .auth import hasher
from .config import ROOT, settings
from .db import SessionLocal
from .services import ingest_local


def main():
    parser = argparse.ArgumentParser(description="Initialize local SPECTRE and its demonstration evidence")
    parser.add_argument("command", choices=["init", "recover"])
    parser.add_argument("--username", default="analyst")
    args = parser.parse_args()
    (ROOT / "data").mkdir(exist_ok=True)
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    command.upgrade(Config(str(ROOT / "backend/alembic.ini")), "head")
    with SessionLocal() as db:
        if args.command == "recover":
            for evidence in db.scalars(select(m.Evidence).where(m.Evidence.status == "processing")):
                evidence.status, evidence.error = (
                    "failed",
                    "Processing interrupted; original retained. Import into a new case to retry.",
                )
                for job in db.scalars(
                    select(m.Job).where(m.Job.evidence_id == evidence.id, m.Job.status == "processing")
                ):
                    job.status, job.error, job.finished_at = "failed", evidence.error, m.now()
                owner = db.get(m.Case, evidence.case_id).owner_id
                db.add(
                    m.Custody(
                        evidence_id=evidence.id, actor_id=owner, action="interrupted_processing_recovered"
                    )
                )
            db.commit()
            print("Interrupted processing marked failed; original evidence retained.")
            return
        if args.username.startswith("__"):
            raise SystemExit("Reserved username")
        if not db.scalar(select(m.User).where(m.User.username == args.username)):
            import os

            password = os.environ.get("SPECTRE_INITIAL_PASSWORD") or getpass.getpass(
                "Choose local analyst password (12+ characters): "
            )
            if len(password) < 12:
                raise SystemExit("Password must contain at least 12 characters")
            db.add(m.User(username=args.username, password_hash=hasher.hash(password)))
            db.commit()
            print(f"Created local account: {args.username}")
        public = db.scalar(select(m.User).where(m.User.username == "__public_demo__"))
        if not public:
            public = m.User(username="__public_demo__", password_hash=hasher.hash(secrets.token_urlsafe(64)))
            db.add(public)
            db.commit()
        case = db.scalar(select(m.Case).where(m.Case.owner_id == public.id, m.Case.is_demo.is_(True)))
        if not case:
            case = m.Case(
                owner_id=public.id,
                name="Operation Glasshouse",
                is_demo=True,
                description="A synthetic document-to-script investigation. All identities, activity and endpoints are fictional.",
            )
            db.add(case)
            db.commit()
        evidence = ingest_local(db, case.id, public.id, ROOT / "datasets/synthetic/glasshouse.jsonl")
        if evidence.status != "ready":
            raise SystemExit(f"Synthetic import failed: {evidence.error}")
        print(
            f"Initialized synthetic case: {evidence.record_count} events. Evidence storage: {settings.storage_dir}"
        )


if __name__ == "__main__":
    main()
