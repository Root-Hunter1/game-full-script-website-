from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import User
from ..security import get_current_user_id


async def require_admin(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):

    result = await db.execute(
        select(User.is_admin).where(User.id == user_id)
    )

    is_admin = result.scalar_one_or_none()

    print(
        "ADMIN CHECK USER ID:",
        user_id,
        "IS_ADMIN:",
        is_admin
    )

    if not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Admin access required",
        )

    return user_id
