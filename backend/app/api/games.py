from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Game, GameCurrency, GamePackage


router = APIRouter(
    prefix="/games",
    tags=["Games"],
)


@router.get("")
async def get_games(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Game)
        .where(Game.is_active == True)
        .order_by(Game.id)
    )

    games = result.scalars().all()

    return [
        {
            "id": game.id,
            "name": game.name,
            "slug": game.slug,
            "image_url": game.image_url,
        }
        for game in games
    ]


@router.get("/{game_id}/currencies")
async def get_game_currencies(
    game_id: int,
    db: AsyncSession = Depends(get_db),
):
    game_result = await db.execute(
        select(Game).where(
            Game.id == game_id,
            Game.is_active == True,
        )
    )

    game = game_result.scalar_one_or_none()

    if game is None:
        raise HTTPException(
            status_code=404,
            detail="Game not found",
        )

    result = await db.execute(
        select(GameCurrency)
        .where(
            GameCurrency.game_id == game_id,
            GameCurrency.is_active == True,
        )
        .order_by(GameCurrency.id)
    )

    currencies = result.scalars().all()

    return [
        {
            "id": currency.id,
            "name": currency.name,
            "symbol": currency.symbol,
        }
        for currency in currencies
    ]


@router.get("/currencies/{currency_id}/packages")
async def get_currency_packages(
    currency_id: int,
    db: AsyncSession = Depends(get_db),
):
    currency_result = await db.execute(
        select(GameCurrency).where(
            GameCurrency.id == currency_id,
            GameCurrency.is_active == True,
        )
    )

    currency = currency_result.scalar_one_or_none()

    if currency is None:
        raise HTTPException(
            status_code=404,
            detail="Currency not found",
        )

    result = await db.execute(
        select(GamePackage)
        .where(
            GamePackage.currency_id == currency_id,
            GamePackage.is_active == True,
        )
        .order_by(GamePackage.amount)
    )

    packages = result.scalars().all()

    return [
        {
            "id": package.id,
            "amount": package.amount,
            "package_name": package.package_name,
            "selling_price": package.selling_price,
        }
        for package in packages
    ]


@router.get("/popular-products")
async def get_popular_products(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            GamePackage.id,
            GamePackage.amount,
            GamePackage.selling_price,
            Game.name.label("game_name"),
            GameCurrency.name.label("currency_name"),
        )
        .join(
            GameCurrency,
            GamePackage.currency_id == GameCurrency.id,
        )
        .join(
            Game,
            GameCurrency.game_id == Game.id,
        )
        .where(
            GamePackage.is_active == True,
            GameCurrency.is_active == True,
            Game.is_active == True,
        )
        .order_by(GamePackage.id)
        .limit(10)
    )

    products = result.all()

    return [
        {
            "id": product.id,
            "amount": product.amount,
            "selling_price": product.selling_price,
            "game_name": product.game_name,
            "currency_name": product.currency_name,
        }
        for product in products
    ]
