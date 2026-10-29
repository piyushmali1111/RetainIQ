"""Local manager sessions. Configure MANAGER_EMAIL/PASSWORD before deployment."""
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.config import settings
from app.db.session import get_db
from app.db.models import ManagerSession

router = APIRouter()
COOKIE = "churnguard_session"

class LoginRequest(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=256)
    remember: bool = False

def valid_session(token: str | None, db: Session):
    if not token:
        return None
    key = hashlib.sha256(token.encode()).hexdigest()
    return db.query(ManagerSession).filter(ManagerSession.token_hash == key, ManagerSession.expires_at > datetime.utcnow()).first()

@router.post("/login")
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    if not (hmac.compare_digest(payload.email.lower().encode(), settings.MANAGER_EMAIL.lower().encode()) and hmac.compare_digest(payload.password.encode(), settings.MANAGER_PASSWORD.encode())):
        raise HTTPException(401, "Email or password is incorrect.")
    token = secrets.token_urlsafe(32)
    seconds = 30 * 86400 if payload.remember else 8 * 3600
    db.query(ManagerSession).filter(ManagerSession.expires_at <= datetime.utcnow()).delete()
    db.add(ManagerSession(token_hash=hashlib.sha256(token.encode()).hexdigest(), expires_at=datetime.utcnow() + timedelta(seconds=seconds)))
    db.commit()
    response.set_cookie(COOKIE, token, httponly=True, samesite="strict", secure=settings.COOKIE_SECURE, max_age=seconds if payload.remember else None)
    return {"name": "Manager", "email": settings.MANAGER_EMAIL}

@router.get("/me")
def me(request: Request, db: Session = Depends(get_db)):
    if not valid_session(request.cookies.get(COOKIE), db):
        raise HTTPException(401, "Please sign in to continue.")
    return {"name": "Manager", "email": settings.MANAGER_EMAIL}

@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    session = valid_session(request.cookies.get(COOKIE), db)
    if session:
        db.delete(session)
        db.commit()
    response.delete_cookie(COOKIE)
    return {"ok": True}
