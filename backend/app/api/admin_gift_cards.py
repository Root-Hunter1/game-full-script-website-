import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import GiftCard
from .dependencies import require_admin


router = APIRouter(
    prefix="/admin/gift-cards",
    tags=["Admin Gift Cards"],
)


def card_json(card: GiftCard) -> dict:
    return {
        "id": card.id,
        "name": card.name,
        "image_url": card.image_url,
        "amount": card.amount,
        "selling_price": card.selling_price,
        "is_active": card.is_active,
    }


async def get_card_or_404(db: AsyncSession, card_id: int) -> GiftCard:
    card = (
        await db.execute(select(GiftCard).where(GiftCard.id == card_id))
    ).scalar_one_or_none()

    if card is None:
        raise HTTPException(status_code=404, detail="Gift card not found")

    return card


PRICE_PATTERN = re.compile(r"^[0-9]+([.][0-9]{1,2})?(-[0-9]+([.][0-9]{1,2})?)?$")


def clean_price(value: str) -> str:
    text = value.strip().replace(" ", "").replace("৳", "").replace("–", "-").replace("—", "-")

    if not PRICE_PATTERN.match(text) or any(float(p) <= 0 for p in text.split("-")):
        raise HTTPException(
            status_code=400,
            detail="Price must be a number like 650 or 170.24, or a range like 650-700",
        )

    return text


def first_number(price: str) -> int:
    return int(float(price.split("-")[0]))


# All gift cards (active and inactive) for the admin panel
@router.get("")
async def list_cards(
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    cards = (await db.execute(select(GiftCard).order_by(GiftCard.id))).scalars().all()
    return [card_json(c) for c in cards]


# Add a gift card: name, image link, price (card value is optional)
@router.post("")
async def add_card(
    name: str,
    selling_price: str,
    image_url: str = "",
    amount: int = 0,
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    name = name.strip()

    if not name:
        raise HTTPException(status_code=400, detail="Card name is required")

    selling_price = clean_price(selling_price)

    card = GiftCard(
        name=name,
        image_url=image_url.strip(),
        amount=amount if amount > 0 else first_number(selling_price),
        selling_price=selling_price,
    )

    db.add(card)
    await db.commit()
    await db.refresh(card)

    return {"message": "Gift card added", "id": card.id}


# Change name, image link or price of an existing gift card
@router.put("/{card_id}")
async def update_card(
    card_id: int,
    name: str,
    selling_price: str,
    image_url: str = "",
    amount: int = 0,
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    card = await get_card_or_404(db, card_id)

    name = name.strip()

    if not name:
        raise HTTPException(status_code=400, detail="Card name is required")

    selling_price = clean_price(selling_price)

    card.name = name
    card.image_url = image_url.strip()
    card.selling_price = selling_price

    if amount > 0:
        card.amount = amount

    await db.commit()

    return {"message": "Gift card updated", "id": card.id}


# Show / hide a gift card on the website
@router.post("/{card_id}/toggle")
async def toggle_card(
    card_id: int,
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    card = await get_card_or_404(db, card_id)

    card.is_active = not card.is_active
    await db.commit()

    return {
        "message": "Gift card activated" if card.is_active else "Gift card deactivated",
        "is_active": card.is_active,
    }
