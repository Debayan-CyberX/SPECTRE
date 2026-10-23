import hashlib

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session as DBSession

from .db import get_db
from .models import Session, User, now

hasher = PasswordHasher()
DUMMY_HASH = hasher.hash("constant-time-missing-user-check")


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def verify(password: str, stored: str) -> bool:
    try:
        return hasher.verify(stored, password)
    except VerificationError:
        return False


def current_user(request: Request, db: DBSession = Depends(get_db)) -> User:
    token = request.cookies.get("spectre_session", "")
    session = db.get(Session, token_hash(token)) if token else None
    if not session or session.expires_at <= now():
        raise HTTPException(401, "Sign in to access investigation data")
    user = db.get(User, session.user_id)
    if not user:
        raise HTTPException(401, "Session is invalid")
    return user
