import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(os.environ.get("SPECTRE_PROJECT_ROOT", Path(__file__).resolve().parents[2])).resolve()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SPECTRE_", env_file=str(ROOT / ".env"), extra="ignore")
    database_url: str = f"sqlite:///{(ROOT / 'data' / 'spectre.db').as_posix()}"
    storage_dir: Path = ROOT / "data" / "evidence"
    allowed_origin: str = "http://127.0.0.1:3000"
    cookie_secure: bool = False
    max_upload_bytes: int = 20 * 1024 * 1024
    parser_timeout: int = 20
    session_hours: int = 8


settings = Settings()
