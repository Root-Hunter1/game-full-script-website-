from .dependencies import require_admin

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import User, WalletDeposit
from ..security import get_current_user_id


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
