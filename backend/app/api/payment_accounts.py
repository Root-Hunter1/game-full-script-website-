from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import PaymentAccount

router = APIRouter(
    prefix="/payment-accounts",
    tags=["Payment Accounts"],
)


# Client দেখবে active accounts
@router.get("")
async def get_payment_accounts(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PaymentAccount)
        .where(PaymentAccount.is_active == True)
    )

    accounts = result.scalars().all()

    return [
        {
            "id": a.id,
            "method": a.method,
            "account_number": a.account_number,
            "account_type": a.account_type,
            "image_url": a.image_url,   
            "network": a.network,
        }
        for a in accounts
    ]


# Admin add account
@router.post("")
async def add_payment_account(
    method: str,
    account_number: str,
    account_type: str | None = None,
    network: str | None = None,
    image_url: str | None = None,
    db: AsyncSession = Depends(get_db),
):

    account = PaymentAccount(
        method=method,
        account_number=account_number,
        account_type=account_type,
        network=network,
        image_url=image_url,
    )

    db.add(account)
    await db.commit()
    await db.refresh(account)

    return {
        "message": "Payment account added",
        "id": account.id,
    }


# Enable/Disable
@router.put("/{account_id}/toggle")
async def toggle_payment_account(
    account_id: int,
    db: AsyncSession = Depends(get_db),
):

    result = await db.execute(
        select(PaymentAccount)
        .where(PaymentAccount.id == account_id)
    )

    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(
            status_code=404,
            detail="Account not found"
        )

    account.is_active = not account.is_active

    await db.commit()

    return {
        "message": "Status updated",
        "active": account.is_active
    }


# START-APEX-EDIT-PAYMENT (admin edit endpoint)
from pydantic import BaseModel

from .dependencies import require_admin


class PaymentAccountUpdate(BaseModel):
    method: str
    account_number: str
    account_type: str | None = None
    network: str | None = None
    image_url: str | None = None


@router.put("/{account_id}")
async def update_payment_account(
    account_id: int,
    data: PaymentAccountUpdate,
    db: AsyncSession = Depends(get_db),
    admin_id: int = Depends(require_admin),
):
    result = await db.execute(
        select(PaymentAccount).where(PaymentAccount.id == account_id)
    )

    account = result.scalar_one_or_none()

    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    method = data.method.strip()
    number = data.account_number.strip()

    if not method or not number:
        raise HTTPException(
            status_code=400,
            detail="Method and account number are required",
        )

    account.method = method
    account.account_number = number
    account.account_type = (data.account_type or "").strip() or None
    account.network = (data.network or "").strip() or None
    account.image_url = (data.image_url or "").strip() or None

    await db.commit()

    return {"message": "Payment account updated", "id": account.id}
# END-APEX-EDIT-PAYMENT
