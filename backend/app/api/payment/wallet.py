from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...database import get_db
from ...models import User, WalletDeposit
from ...security import get_current_user_id
from ..admin import require_admin

router = APIRouter(
    prefix="/wallet",
    tags=["Wallet"],
)


@router.get("")
async def get_wallet(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User.wallet_balance).where(User.id == user_id)
    )

    wallet_balance = result.scalar_one()

    return {
        "user_id": user_id,
        "wallet_balance": wallet_balance,
    }


@router.post("/deposit")
async def create_wallet_deposit(
    amount: int,
    payment_method: str,
    transaction_id: str,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    if amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Amount must be greater than 0",
        )

    existing = await db.execute(
        select(WalletDeposit).where(
            WalletDeposit.transaction_id == transaction_id
        )
    )

    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Transaction ID already used",
        )

    deposit = WalletDeposit(
        user_id=user_id,
        amount=amount,
        payment_method=payment_method,
        transaction_id=transaction_id,
        status="pending",
    )

    db.add(deposit)

    await db.commit()
    await db.refresh(deposit)

    return {
        "message": "Deposit request submitted",
        "deposit_id": deposit.id,
        "amount": deposit.amount,
        "payment_method": deposit.payment_method,
        "transaction_id": deposit.transaction_id,
        "status": deposit.status,
    }

@router.get("/deposits")
async def get_deposits(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User.is_admin).where(User.id == user_id)
    )

    is_admin = result.scalar_one_or_none()

    if not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Admin access required",
        )

    result = await db.execute(
        select(WalletDeposit)
        .order_by(WalletDeposit.id.desc())
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


@router.post("/deposits/{deposit_id}/approve")
async def approve_deposit(
    deposit_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User.is_admin).where(User.id == user_id)
    )

    is_admin = result.scalar_one_or_none()

    if not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Admin access required",
        )

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

    if deposit.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Deposit is not pending",
        )

    result = await db.execute(
        select(User).where(
            User.id == deposit.user_id
        )
    )

    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    user.wallet_balance += deposit.amount
    deposit.status = "approved"

    await db.commit()

    return {
        "message": "Deposit approved successfully",
        "deposit_id": deposit.id,
        "user_id": user.id,
        "amount_added": deposit.amount,
        "wallet_balance": user.wallet_balance,
        "status": deposit.status,
    }

@router.post("/deposits/{deposit_id}/approve")
async def approve_deposit(
    deposit_id: int,
    admin_id: int = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):

    result = await db.execute(
        select(WalletDeposit)
        .where(WalletDeposit.id == deposit_id)
    )

    deposit = result.scalar_one_or_none()

    if not deposit:
        raise HTTPException(
            status_code=404,
            detail="Deposit not found"
        )

    if deposit.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Already processed"
        )


    user_result = await db.execute(
        select(User)
        .where(User.id == deposit.user_id)
    )

    user = user_result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )


    user.wallet_balance += deposit.amount

    deposit.status = "approved"

    await db.commit()


    return {
        "message": "Deposit approved",
        "deposit_id": deposit.id,
        "status": deposit.status
    }
