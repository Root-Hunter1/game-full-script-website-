from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Game, GameCurrency, GamePackage, SupplierProductMapping
from .admin import require_admin


router = APIRouter(
    prefix="/admin/games",
    tags=["Admin Games"],
)


def make_slug(value: str) -> str:
    return "-".join(value.strip().lower().split())


@router.get("/overview")
async def games_overview(
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    games = (await db.execute(select(Game).order_by(Game.id))).scalars().all()
    currencies = (await db.execute(select(GameCurrency).order_by(GameCurrency.id))).scalars().all()
    packages = (await db.execute(select(GamePackage).order_by(GamePackage.amount))).scalars().all()
    mappings = (
        await db.execute(
            select(SupplierProductMapping).where(SupplierProductMapping.is_active == True)
        )
    ).scalars().all()

    mapping_by_package = {}
    for m in mappings:
        mapping_by_package.setdefault(m.package_id, m)

    result = []
    for game in games:
        game_currencies = []
        for cur in currencies:
            if cur.game_id != game.id:
                continue
            cur_packages = []
            for pkg in packages:
                if pkg.currency_id != cur.id:
                    continue
                m = mapping_by_package.get(pkg.id)
                cur_packages.append({
                    "id": pkg.id,
                    "amount": pkg.amount,
                    "package_name": pkg.package_name,
                    "cost_price": pkg.cost_price,
                    "selling_price": pkg.selling_price,
                    "is_active": pkg.is_active,
                    "mapping": None if m is None else {
                        "supplier_name": m.supplier_name,
                        "supplier_product_id": m.supplier_product_id,
                        "supplier_variation_id": m.supplier_variation_id,
                    },
                })
            game_currencies.append({
                "id": cur.id,
                "name": cur.name,
                "symbol": cur.symbol,
                "is_active": cur.is_active,
                "packages": cur_packages,
            })
        result.append({
            "id": game.id,
            "name": game.name,
            "slug": game.slug,
            "image_url": game.image_url,
            "is_active": game.is_active,
            "currencies": game_currencies,
        })

    return result


@router.post("")
async def add_game(
    name: str,
    slug: str = "",
    image_url: str = "",
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    name = name.strip()
    slug = make_slug(slug or name)

    if not name:
        raise HTTPException(status_code=400, detail="Game name is required")

    existing = await db.execute(
        select(Game).where((Game.name == name) | (Game.slug == slug))
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="A game with this name or slug already exists")

    game = Game(
        name=name,
        slug=slug,
        image_url=image_url.strip(),
    )

    db.add(game)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="A game with this name or slug already exists")

    await db.refresh(game)

    return {
        "message": "Game added",
        "id": game.id,
    }


@router.post("/{game_id}/currency")
async def add_currency(
    game_id: int,
    name: str,
    symbol: str,
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    game = (await db.execute(select(Game).where(Game.id == game_id))).scalar_one_or_none()

    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")

    if not name.strip():
        raise HTTPException(status_code=400, detail="Currency name is required")

    currency = GameCurrency(
        game_id=game_id,
        name=name.strip(),
        symbol=symbol.strip(),
    )

    db.add(currency)
    await db.commit()
    await db.refresh(currency)

    return {
        "message": "Currency added",
        "id": currency.id,
    }


@router.post("/currency/{currency_id}/package")
async def add_package(
    currency_id: int,
    amount: float,
    cost_price: float,
    selling_price: float,
    package_name: str = "",
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    currency = (
        await db.execute(select(GameCurrency).where(GameCurrency.id == currency_id))
    ).scalar_one_or_none()

    if currency is None:
        raise HTTPException(status_code=404, detail="Currency not found")

    if not (0 < amount < 100_000_000) or not (0 <= cost_price < 10_000_000) or not (0 <= selling_price < 10_000_000):
        raise HTTPException(status_code=400, detail="Amount must be above 0 and prices cannot be negative")

    package = GamePackage(
        currency_id=currency_id,
        amount=round(amount, 2),
        package_name=package_name.strip() or None,
        cost_price=round(cost_price, 2),
        selling_price=round(selling_price, 2),
    )

    db.add(package)
    await db.commit()
    await db.refresh(package)

    return {
        "message": "Package added",
        "id": package.id,
    }


@router.post("/mapping")
async def set_mapping(
    package_id: int,
    supplier_product_id: str,
    supplier_variation_id: str = "",
    supplier_name: str = "vertexbazaar",
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    package = (
        await db.execute(select(GamePackage).where(GamePackage.id == package_id))
    ).scalar_one_or_none()

    if package is None:
        raise HTTPException(status_code=404, detail="Package not found")

    supplier_product_id = supplier_product_id.strip()
    supplier_variation_id = supplier_variation_id.strip()
    supplier_name = supplier_name.strip().lower() or "vertexbazaar"

    if not supplier_product_id:
        raise HTTPException(status_code=400, detail="Supplier product ID is required")

    existing = (
        await db.execute(
            select(SupplierProductMapping)
            .where(
                SupplierProductMapping.package_id == package_id,
                SupplierProductMapping.is_active == True,
            )
            .order_by(SupplierProductMapping.id)
        )
    ).scalars().first()

    if existing:
        existing.supplier_name = supplier_name
        existing.supplier_product_id = supplier_product_id
        existing.supplier_variation_id = supplier_variation_id or None
        await db.commit()
        return {"message": "Mapping updated", "id": existing.id}

    mapping = SupplierProductMapping(
        package_id=package_id,
        supplier_name=supplier_name,
        supplier_product_id=supplier_product_id,
        supplier_variation_id=supplier_variation_id or None,
    )

    db.add(mapping)
    await db.commit()
    await db.refresh(mapping)

    return {"message": "Mapping added", "id": mapping.id}


@router.post("/{game_id}/toggle")
async def toggle_game(
    game_id: int,
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    game = (await db.execute(select(Game).where(Game.id == game_id))).scalar_one_or_none()

    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")

    game.is_active = not game.is_active
    await db.commit()

    return {
        "message": "Game activated" if game.is_active else "Game deactivated",
        "is_active": game.is_active,
    }


@router.post("/{game_id}/image")
async def set_game_image(
    game_id: int,
    image_url: str = "",
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    image_url = image_url.strip()

    if image_url and not image_url.lower().startswith(("http://", "https://", "/")):
        raise HTTPException(status_code=400, detail="Image link must start with https://")

    game = (await db.execute(select(Game).where(Game.id == game_id))).scalar_one_or_none()

    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")

    game.image_url = image_url
    await db.commit()

    return {"message": "Photo updated", "image_url": game.image_url}


# ---------------------------------------------------------
# Delete a wrong game / currency / package.
# Blocked when orders already exist for it.
# ---------------------------------------------------------
from sqlalchemy import delete, func

from ..models import Order


async def count_orders(db: AsyncSession, package_ids: list) -> int:
    if not package_ids:
        return 0

    result = await db.execute(
        select(func.count()).select_from(Order).where(Order.package_id.in_(package_ids))
    )
    return result.scalar() or 0


async def remove_packages(db: AsyncSession, package_ids: list):
    if package_ids:
        await db.execute(
            delete(SupplierProductMapping).where(SupplierProductMapping.package_id.in_(package_ids))
        )
        await db.execute(
            delete(GamePackage).where(GamePackage.id.in_(package_ids))
        )


@router.delete("/package/{package_id}")
async def delete_package(
    package_id: int,
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    package = (
        await db.execute(select(GamePackage).where(GamePackage.id == package_id))
    ).scalar_one_or_none()

    if package is None:
        raise HTTPException(status_code=404, detail="Package not found")

    if await count_orders(db, [package_id]) > 0:
        raise HTTPException(status_code=400, detail="This package has orders, so it cannot be deleted")

    await remove_packages(db, [package_id])
    await db.commit()

    return {"message": "Package deleted"}


@router.delete("/currency/{currency_id}")
async def delete_currency(
    currency_id: int,
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    currency = (
        await db.execute(select(GameCurrency).where(GameCurrency.id == currency_id))
    ).scalar_one_or_none()

    if currency is None:
        raise HTTPException(status_code=404, detail="Currency not found")

    package_ids = list(
        (
            await db.execute(select(GamePackage.id).where(GamePackage.currency_id == currency_id))
        ).scalars().all()
    )

    if await count_orders(db, package_ids) > 0:
        raise HTTPException(status_code=400, detail="This currency has orders, so it cannot be deleted")

    await remove_packages(db, package_ids)
    await db.delete(currency)
    await db.commit()

    return {"message": f"Currency deleted ({len(package_ids)} packages removed)"}


@router.delete("/game/{game_id}")
async def delete_game(
    game_id: int,
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    game = (await db.execute(select(Game).where(Game.id == game_id))).scalar_one_or_none()

    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")

    currency_ids = list(
        (
            await db.execute(select(GameCurrency.id).where(GameCurrency.game_id == game_id))
        ).scalars().all()
    )

    package_ids = []
    if currency_ids:
        package_ids = list(
            (
                await db.execute(select(GamePackage.id).where(GamePackage.currency_id.in_(currency_ids)))
            ).scalars().all()
        )

    if await count_orders(db, package_ids) > 0:
        raise HTTPException(
            status_code=400,
            detail="This game has orders, so it cannot be deleted. Use the Active/Inactive button to hide it instead",
        )

    await remove_packages(db, package_ids)

    if currency_ids:
        await db.execute(delete(GameCurrency).where(GameCurrency.id.in_(currency_ids)))

    await db.delete(game)
    await db.commit()

    return {"message": f"Game deleted ({len(currency_ids)} currencies, {len(package_ids)} packages removed)"}


# ---------------------------------------------------------
# Edit: rename game / currency, change package amount + prices
# ---------------------------------------------------------
@router.post("/{game_id}/rename")
async def rename_game(
    game_id: int,
    name: str,
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Game name is required")

    game = (await db.execute(select(Game).where(Game.id == game_id))).scalar_one_or_none()
    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")

    dup = await db.execute(select(Game).where(Game.name == name, Game.id != game_id))
    if dup.scalars().first():
        raise HTTPException(status_code=400, detail="A game with this name already exists")

    game.name = name
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="A game with this name already exists")

    return {"message": "Game updated"}


@router.post("/currency/{currency_id}/rename")
async def rename_currency(
    currency_id: int,
    name: str,
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    name = name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Currency name is required")

    cur = (
        await db.execute(select(GameCurrency).where(GameCurrency.id == currency_id))
    ).scalar_one_or_none()
    if cur is None:
        raise HTTPException(status_code=404, detail="Currency not found")

    if cur.symbol == cur.name:
        cur.symbol = name[:50]
    cur.name = name
    await db.commit()

    return {"message": "Currency updated"}


@router.post("/package/{package_id}/update")
async def update_package(
    package_id: int,
    amount: float,
    cost_price: float,
    selling_price: float,
    package_name: str = "",
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if not (0 < amount < 100_000_000) or not (0 <= cost_price < 10_000_000) or not (0 <= selling_price < 10_000_000):
        raise HTTPException(status_code=400, detail="Amount must be above 0 and prices cannot be negative")

    pkg = (
        await db.execute(select(GamePackage).where(GamePackage.id == package_id))
    ).scalar_one_or_none()
    if pkg is None:
        raise HTTPException(status_code=404, detail="Package not found")

    pkg.amount = round(amount, 2)
    pkg.cost_price = round(cost_price, 2)
    pkg.selling_price = round(selling_price, 2)
    pkg.package_name = package_name.strip() or None
    await db.commit()

    return {"message": "Package updated"}
