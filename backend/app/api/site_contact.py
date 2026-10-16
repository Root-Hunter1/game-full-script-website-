import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import SiteSetting
from .dependencies import require_admin


router = APIRouter(tags=["Site Contact"])

DEFAULTS = {
    "whatsapp": "8800000000000",
    "phone": "8800000000000",
    "email": "your-email@example.com",
}


def normalize_number(raw: str) -> str:
    """01XXXXXXXXX / +8801XXXXXXXXX / 8801XXXXXXXXX -> 8801XXXXXXXXX"""
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("00"):
        digits = digits[2:]
    if digits.startswith("0") and len(digits) == 11:
        digits = "880" + digits[1:]
    if not 8 <= len(digits) <= 15:
        raise HTTPException(status_code=400, detail="Enter a valid phone number")
    return digits


def normalize_email(raw: str) -> str:
    email = (raw or "").strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email) or len(email) > 200:
        raise HTTPException(status_code=400, detail="Enter a valid email address")
    return email


async def read_contact(db: AsyncSession) -> dict:
    rows = (
        await db.execute(
            select(SiteSetting).where(
                SiteSetting.key.in_(["contact_whatsapp", "contact_phone", "contact_email"])
            )
        )
    ).scalars().all()
    saved = {r.key: r.value for r in rows}
    return {
        "whatsapp": saved.get("contact_whatsapp") or DEFAULTS["whatsapp"],
        "phone": saved.get("contact_phone") or DEFAULTS["phone"],
        "email": saved.get("contact_email") or DEFAULTS["email"],
    }


@router.get("/site-contact")
async def get_contact(db: AsyncSession = Depends(get_db)):
    return await read_contact(db)


class ContactIn(BaseModel):
    whatsapp: str
    phone: str
    email: Optional[str] = None


@router.post("/admin/site-contact")
async def set_contact(
    data: ContactIn,
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    values = {
        "contact_whatsapp": normalize_number(data.whatsapp),
        "contact_phone": normalize_number(data.phone),
    }
    if data.email is not None:
        values["contact_email"] = normalize_email(data.email)

    for key, value in values.items():
        row = (
            await db.execute(select(SiteSetting).where(SiteSetting.key == key))
        ).scalar_one_or_none()
        if row is None:
            db.add(SiteSetting(key=key, value=value))
        else:
            row.value = value
    await db.commit()

    return {"message": "Contact details saved", **(await read_contact(db))}
