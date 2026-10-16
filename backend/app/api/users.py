from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import User
from ..schemas import UserCreate
from ..security import hash_password, get_current_user_id

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


@router.post("")
async def create_user(
    user: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.email == user.email)
    )

    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    password_hash = hash_password(user.password)

    new_user = User(
        name=user.name,
        email=user.email,
        password_hash=password_hash,
    )

    db.add(new_user)

    await db.commit()
    await db.refresh(new_user)

    return {
        "id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
    }

@router.get("/me")
async def get_me(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.id == user_id)
    )

    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "is_admin": user.is_admin,
    }  

