from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import GiftCard


router = APIRouter(
    prefix="/gift-cards",
    tags=["Gift Cards"],
)


@router.get("")
async def get_gift_cards(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GiftCard)
        .where(GiftCard.is_active == True)
        .order_by(GiftCard.id)
    )

    gift_cards = result.scalars().all()

    return [
        {
            "id": card.id,
            "name": card.name,
            "image_url": card.image_url,
            "amount": card.amount,
            "selling_price": card.selling_price,
        }
        for card in gift_cards
    ]
