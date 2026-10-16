from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

import bcrypt

from .config import settings


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")

    hashed = bcrypt.hashpw(
        password_bytes,
        bcrypt.gensalt(),
    )

    return hashed.decode("utf-8")


def verify_password(
    password: str,
    hashed_password: str,
) -> bool:
    password_bytes = password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")

    return bcrypt.checkpw(
        password_bytes,
        hashed_bytes,
    )


def create_access_token(
    user_id: int,
) -> str:
    from datetime import datetime, timedelta, timezone

    expire = datetime.now(timezone.utc) + timedelta(
        days=30
    )

    payload = {
        "sub": str(user_id),
        "exp": expire,
    }

    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/login"
)

oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl="/auth/login",
    auto_error=False,
)

def get_current_user_id(
    token: str = Depends(oauth2_scheme),
) -> int:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )

        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid token",
            )

        return int(user_id)

    except (JWTError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
        )
def get_current_user_id_optional(
    token: str | None = Depends(oauth2_scheme_optional),
) -> int | None:
    if not token:
        return None

    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )

        user_id = payload.get("sub")

        if user_id is None:
            return None

        return int(user_id)

    except (JWTError, ValueError):
        return None
