from .dependencies import require_admin

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import User, Order, WalletDeposit, GamePackage, GameCurrency
from ..package_label import build_package_label
from ..supplier import deliver_order

from ..security import get_current_user_id


router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)

@router.get("/orders")
async def get_all_orders(
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(
            Order,
            GamePackage.package_name,
            GameCurrency.name,
        )
        .outerjoin(
            GamePackage,
            GamePackage.id == Order.package_id,
        )
        .outerjoin(
            GameCurrency,
            GameCurrency.id == GamePackage.currency_id,
        )
        .order_by(Order.id.desc())
    )

    rows = result.all()

    return [
        {
            "id": order.id,
            "user_id": order.user_id,
            "package_id": order.package_id,
            "player_id": order.player_id,
            "game_name": order.game_name,
            "package_amount": order.package_amount,
            "currency_name": currency_name,
            "package_label": build_package_label(
                order.package_amount,
                package_name,
                currency_name,
            ),
            "quantity": order.quantity,
            "price": order.price,
            "payment_method": order.payment_method,
            "transaction_id": order.transaction_id,
            "supplier_name": order.supplier_name,
            "supplier_order_id": order.supplier_order_id,
            "supplier_status": order.supplier_status,
            "status": order.status,
            "created_at": order.created_at,
        }
        for order, package_name, currency_name in rows
    ]

@router.post("/orders/{order_id}/status")
async def update_order_status(
    order_id: int,
    status: str,
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order).where(Order.id == order_id)
    )

    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    # CANCEL ORDER
    if status == "failed":
        if order.status not in ("pending", "paid"):
            raise HTTPException(
                status_code=400,
                detail="Only pending/paid orders can be cancelled",
            )

        order.status = "failed"

        await db.commit()
        await db.refresh(order)

        return {
            "message": "Order cancelled",
            "order_id": order.id,
            "status": order.status,
        }

    # APPROVE + SEND TO SUPPLIER
    if status == "processing":
        if order.status != "paid":
            raise HTTPException(
                status_code=400,
                detail="Only paid orders can be approved",
            )

        # Gift card orders (package_id < 0) are delivered manually.
        # They must never be sent to a supplier.
        if order.package_id < 0:
            order.supplier_name = "manual"
            order.supplier_status = "manual_gift_card"
            order.status = "processing"

            await db.commit()
            await db.refresh(order)

            return {
                "message": "Gift card order accepted. Deliver the code manually, then click Complete.",
                "order_id": order.id,
                "status": order.status,
                "supplier_name": order.supplier_name,
                "supplier_order_id": order.supplier_order_id,
                "supplier_status": order.supplier_status,
            }

        supplier_result = await deliver_order(
            package_id=order.package_id,
            player_id=order.player_id,
            order_id=order.id,
            db=db,
            quantity=order.quantity,
        )

        if not supplier_result.get("success"):
            order.supplier_status = supplier_result.get("status")
            order.status = "delivery_failed"

            await db.commit()
            await db.refresh(order)

            raise HTTPException(
                status_code=502,
                detail=supplier_result.get(
                    "message",
                    "Supplier delivery failed"
                ),
            )

        order.supplier_name = supplier_result.get(
            "supplier_name"
        )
        order.supplier_order_id = supplier_result.get(
            "supplier_order_id"
        )
        order.supplier_status = supplier_result.get(
            "status"
        )
        order.status = "processing"

        await db.commit()
        await db.refresh(order)

        return {
            "message": "Order approved and sent to supplier",
            "order_id": order.id,
            "status": order.status,
            "supplier_name": order.supplier_name,
            "supplier_order_id": order.supplier_order_id,
            "supplier_status": order.supplier_status,
        }

    # MANUAL COMPLETE
    if status == "completed":
        if order.status != "processing":
            raise HTTPException(
                status_code=400,
                detail="Only processing orders can be completed",
            )

        order.status = "completed"

        await db.commit()
        await db.refresh(order)

        return {
            "message": "Order completed",
            "order_id": order.id,
            "status": order.status,
        }

    raise HTTPException(
        status_code=400,
        detail="Invalid status",
    )


@router.post("/deposits/{deposit_id}/status")
async def update_deposit_status(
    deposit_id: int,
    status: str,
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WalletDeposit).where(
            WalletDeposit.id == deposit_id
        )
    )

    deposit = result.scalar_one_or_none()

    if not deposit:
        raise HTTPException(
            status_code=404,
            detail="Deposit not found",
        )

    if status not in [
        "pending",
        "approved",
        "rejected",
    ]:
        raise HTTPException(
            status_code=400,
            detail="Invalid status",
        )

    await db.refresh(deposit, with_for_update=True)

    if deposit.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Deposit already processed",
        )

    if status == "approved":
        user_result = await db.execute(
            select(User)
            .where(User.id == deposit.user_id)
            .with_for_update()
        )

        user = user_result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found",
            )

        user.wallet_balance += deposit.amount

    deposit.status = status

    await db.commit()

    return {
        "message": "Deposit status updated",
        "id": deposit.id,
        "status": deposit.status,
    }


@router.get("/deposits")
async def get_all_deposits(
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WalletDeposit).order_by(WalletDeposit.id.desc())
    )

    deposits = result.scalars().all()

    return [
        {
            "id": deposit.id,
            "user_id": deposit.user_id,
            "amount": deposit.amount,
            "payment_method": deposit.payment_method,
            "transaction_id": deposit.transaction_id,
            "status": deposit.status,
            "created_at": deposit.created_at,
        }
        for deposit in deposits
    ]
