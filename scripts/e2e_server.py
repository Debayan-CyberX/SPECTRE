"""Disposable real API for browser tests. Never touches the analyst's local database."""

import os
import sys
import tempfile
from pathlib import Path

with tempfile.TemporaryDirectory(prefix="spectre-e2e-") as directory:
    root = Path(directory)
    os.environ.update(
        SPECTRE_DATABASE_URL=f"sqlite:///{(root / 'test.db').as_posix()}",
        SPECTRE_STORAGE_DIR=str(root / "evidence"),
        SPECTRE_ALLOWED_ORIGIN="http://127.0.0.1:3100",
        SPECTRE_INITIAL_PASSWORD="Spectre-E2E-only-passphrase",
    )
    from spectre.cli import main

    sys.argv = ["spectre", "init"]
    main()
    import uvicorn

    try:
        uvicorn.run("spectre.main:app", host="127.0.0.1", port=8101, access_log=False)
    finally:
        from spectre.db import engine

        engine.dispose()
