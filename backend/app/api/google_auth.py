import secrets

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..models import User
from ..security import create_access_token, hash_password

router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"


class GoogleLoginRequest(BaseModel):
    credential: str


@router.get("/google/config")
async def google_config():
    return {"client_id": settings.google_client_id}


@router.post("/google")
async def google_login(
    data: GoogleLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    if not settings.google_client_id:
        raise HTTPException(
            status_code=503,
            detail="Google sign-in is not configured",
        )

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                GOOGLE_TOKENINFO_URL,
                params={"id_token": data.credential},
            )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=502,
            detail="Could not reach Google. Please try again.",
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=401,
            detail="Invalid Google token",
        )

    info = response.json()

    if info.get("aud") != settings.google_client_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid Google token",
        )

    if info.get("iss") not in (
        "accounts.google.com",
        "https://accounts.google.com",
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid Google token",
        )

    if str(info.get("email_verified")).lower() != "true":
        raise HTTPException(
            status_code=401,
            detail="Google email is not verified",
        )

    email = (info.get("email") or "").strip().lower()

    if not email:
        raise HTTPException(
            status_code=401,
            detail="Google account has no email",
        )

    result = await db.execute(
        select(User).where(func.lower(User.email) == email)
    )

    user = result.scalar_one_or_none()

    if not user:
        name = (info.get("name") or email.split("@")[0])[:100]

        user = User(
            name=name,
            email=email,
            # random password: this account signs in with Google
            password_hash=hash_password(secrets.token_urlsafe(32)),
        )

        db.add(user)
        await db.commit()
        await db.refresh(user)

    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
    }
