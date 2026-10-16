from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import User
from ..security import verify_password, create_access_token
from ..rate_limit import login_limiter, forgot_password_limiter


router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


@router.post("/login", dependencies=[Depends(login_limiter)])
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.email == form_data.username)
    )

    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    password_valid = verify_password(
        form_data.password,
        user.password_hash,
    )

    if not password_valid:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )

    access_token = create_access_token(user.id)

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


# ===== FORGOT / RESET PASSWORD =====
import hashlib
import logging
import time
from datetime import datetime, timedelta, timezone

from fastapi import BackgroundTasks
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy import func

from ..config import settings
from ..email_service import send_password_reset_email
from ..security import hash_password

logger = logging.getLogger(__name__)

RESET_TOKEN_MINUTES = 30
RESET_COOLDOWN_SECONDS = 60
_reset_last_request: dict[str, float] = {}


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


def _reset_secret() -> str:
    # Different key from login tokens, so a reset token can never be
    # used as a login token (and the other way around).
    return settings.jwt_secret_key + ":password-reset"


def _password_fingerprint(password_hash: str) -> str:
    # Changes whenever the password changes, so a reset link works only once.
    return hashlib.sha256(password_hash.encode("utf-8")).hexdigest()[:24]


def _create_reset_token(user: User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=RESET_TOKEN_MINUTES
    )

    payload = {
        "sub": str(user.id),
        "purpose": "password_reset",
        "pf": _password_fingerprint(user.password_hash),
        "exp": expire,
    }

    return jwt.encode(
        payload,
        _reset_secret(),
        algorithm=settings.jwt_algorithm,
    )


async def _send_reset_email_safe(to_email: str, link: str):
    try:
        await send_password_reset_email(to_email, link)
    except Exception:
        logger.exception("Could not send password reset email")


@router.post("/forgot-password", dependencies=[Depends(forgot_password_limiter)])
async def forgot_password(
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    # Same answer whether the email exists or not.
    generic = {
        "message": "If an account exists for this email, "
        "a password reset link has been sent."
    }

    email = data.email.strip().lower()

    now = time.time()

    if len(_reset_last_request) > 5000:
        _reset_last_request.clear()

    last = _reset_last_request.get(email, 0)

    if now - last < RESET_COOLDOWN_SECONDS:
        return generic

    _reset_last_request[email] = now

    result = await db.execute(
        select(User).where(func.lower(User.email) == email)
    )

    user = result.scalars().first()

    if user:
        token = _create_reset_token(user)

        link = (
            settings.frontend_url.rstrip("/")
            + "/reset-password.html?token="
            + token
        )

        background_tasks.add_task(
            _send_reset_email_safe,
            user.email,
            link,
        )

    return generic


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    invalid = HTTPException(
        status_code=400,
        detail="This reset link is invalid or has expired.",
    )

    if len(data.new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters.",
        )

    if len(data.new_password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=400,
            detail="Password is too long (max 72 characters).",
        )

    try:
        payload = jwt.decode(
            data.token,
            _reset_secret(),
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError:
        raise invalid

    if payload.get("purpose") != "password_reset":
        raise invalid

    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise invalid

    user = await db.get(User, user_id)

    if (
        not user
        or payload.get("pf") != _password_fingerprint(user.password_hash)
    ):
        raise invalid

    user.password_hash = hash_password(data.new_password)

    await db.commit()

    return {"message": "Password updated. You can now log in."}



# ===== CHANGE PASSWORD (logged-in user, used by the admin panel) =====
from ..security import get_current_user_id


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password", dependencies=[Depends(login_limiter)])
async def change_password(
    data: ChangePasswordRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)

    ok = False
    if user and len(data.current_password.encode("utf-8")) <= 72:
        ok = verify_password(data.current_password, user.password_hash)

    if not ok:
        raise HTTPException(status_code=400, detail="Current password is wrong.")

    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 8 characters.",
        )

    if len(data.new_password.encode("utf-8")) > 72:
        raise HTTPException(
            status_code=400,
            detail="New password is too long (max 72 characters).",
        )

    if data.new_password == data.current_password:
        raise HTTPException(
            status_code=400,
            detail="New password must be different from the current one.",
        )

    user.password_hash = hash_password(data.new_password)
    await db.commit()

    return {"message": "Password changed."}



# ===== CHANGE EMAIL (logged-in user, used by the admin panel) =====
from sqlalchemy.exc import IntegrityError


class ChangeEmailRequest(BaseModel):
    new_email: EmailStr
    current_password: str


@router.post("/change-email", dependencies=[Depends(login_limiter)])
async def change_email(
    data: ChangeEmailRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)

    ok = False
    if user and len(data.current_password.encode("utf-8")) <= 72:
        ok = verify_password(data.current_password, user.password_hash)

    if not ok:
        raise HTTPException(status_code=400, detail="Current password is wrong.")

    new_email = str(data.new_email).strip().lower()

    if new_email == (user.email or "").strip().lower():
        raise HTTPException(status_code=400, detail="This is already your Gmail.")

    taken = await db.execute(
        select(User.id).where(func.lower(User.email) == new_email, User.id != user.id)
    )
    if taken.first():
        raise HTTPException(
            status_code=400,
            detail="This Gmail is already used by another account.",
        )

    user.email = new_email

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=400,
            detail="This Gmail is already used by another account.",
        )

    return {"message": "Gmail changed.", "email": new_email}
