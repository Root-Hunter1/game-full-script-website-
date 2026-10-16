import secrets
import string

from ..models import User
from ..security import get_current_user_id, get_current_user_id_optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import GamePackage, GameCurrency, Game, Order

from ..supplier import deliver_order
from ..email_service import send_order_email
from ..package_label import build_package_label

def generate_public_order_id():
    chars = string.ascii_uppercase + string.digits
    code = "".join(secrets.choice(chars) for _ in range(6))
    return f"APX-{code}"

MAX_QUANTITY = 10

router = APIRouter(
    prefix="/orders",
    tags=["Orders"],
)


@router.post("")
async def create_order(
    package_id: int,
    player_id: str,
    quantity: int = 1,
    db: AsyncSession = Depends(get_db),
    user_id: int | None = Depends(get_current_user_id_optional),
):

    if quantity < 1 or quantity > MAX_QUANTITY:
        raise HTTPException(
            status_code=400,
            detail=f"Quantity must be between 1 and {MAX_QUANTITY}",
        )

    if not player_id.strip():
        raise HTTPException(
            status_code=400,
            detail="Player ID is required",
        )

    result = await db.execute(
        select(
            GamePackage,
            GameCurrency,
            Game,
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
            GamePackage.id == package_id,
            GamePackage.is_active == True,
            GameCurrency.is_active == True,
            Game.is_active == True,
        )
    )

    row = result.first()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Package not found",
        )

    package, currency, game = row

    order = Order(
        public_order_id=generate_public_order_id(),
        user_id=user_id,
        package_id=package.id,
        player_id=player_id.strip(),
        game_name=game.name,
        package_amount=package.amount,
        price=round(package.selling_price * quantity, 2),
        quantity=quantity,
        status="pending",
    )

    db.add(order)

    await db.commit()
    await db.refresh(order)

    return {
        "message": "Order created successfully",
        "order_id": order.id,
        "player_id": order.player_id,
        "game_name": order.game_name,
        "amount": order.package_amount,
        "package_label": build_package_label(
            package.amount,
            package.package_name,
            currency.name,
        ),
        "currency_name": currency.name,
        "quantity": order.quantity,
        "price": order.price,
        "status": order.status,
    }

@router.get("")
async def get_my_orders(
    user_id: int = Depends(get_current_user_id),
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
        .where(Order.user_id == user_id)
        .order_by(Order.id.desc())
    )

    rows = result.all()

    return [
        {
            "order_id": order.id,
            "public_order_id": order.public_order_id,
            "game_name": order.game_name,
            "player_id": order.player_id,
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
            "status": order.status,
            "supplier_status": order.supplier_status,
            "created_at": order.created_at,
        }
        for order, package_name, currency_name in rows
    ]


@router.post("/{order_id}/payment")
async def confirm_payment(
    order_id: int,
    payment_method: str,
    transaction_id: str,
    customer_email: str,
    db: AsyncSession = Depends(get_db),
):
    payment_method = payment_method.strip()
    transaction_id = transaction_id.strip()

    if not payment_method:
        raise HTTPException(
            status_code=400,
            detail="Payment method is required",
        )

    if not transaction_id:
        raise HTTPException(
            status_code=400,
            detail="Transaction ID is required",
        )

    # Check order
    result = await db.execute(
        select(Order).where(Order.id == order_id)
    )

    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    if order.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Order is not pending",
        )

    # Prevent duplicate transaction
    result = await db.execute(
        select(Order).where(
            Order.transaction_id == transaction_id
        )
    )

    existing_order = result.scalar_one_or_none()

    if existing_order:
        raise HTTPException(
            status_code=400,
            detail="Transaction ID already used",
        )

    # Save payment information
    order.payment_method = payment_method
    order.transaction_id = transaction_id
    order.status = "paid"

    await db.commit()
    await db.refresh(order)

    # Keep paid order in Original Orders.
    # Admin can move it to Processing from the existing Admin Panel.
    order.supplier_status = None
    order.supplier_order_id = None

    await db.commit()
    await db.refresh(order)

    label_result = await db.execute(
        select(GamePackage.package_name, GameCurrency.name)
        .outerjoin(
            GameCurrency,
            GameCurrency.id == GamePackage.currency_id,
        )
        .where(GamePackage.id == order.package_id)
    )
    label_row = label_result.first()

    package_label = build_package_label(
        order.package_amount,
        label_row[0] if label_row else None,
        label_row[1] if label_row else None,
    )

    try:
        await send_order_email(
            to_email=customer_email.strip(),
            order_id=order.id,
            game_name=order.game_name,
            player_id=order.player_id,
            package_amount=package_label,
            price=order.price,
            payment_method=order.payment_method,
            status=order.status,
            quantity=order.quantity,
        )
    except Exception as e:
        print("ORDER EMAIL FAILED:", e)

    return {
        "message": "Payment confirmed",
        "order_id": order.id,
        "payment_method": order.payment_method,
        "transaction_id": order.transaction_id,
        "payment_status": "paid",
        "supplier_status": order.supplier_status,
        "order_status": order.status,
    }


@router.post("/{order_id}/wallet-payment")
async def wallet_payment(
    order_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .with_for_update()
    )

    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found",
        )

    if order.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Order is not pending",
        )

    # Order must belong to the logged-in user
    if order.user_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="This order does not belong to you",
        )

    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .with_for_update()
    )

    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    if user.wallet_balance < order.price:
        raise HTTPException(
            status_code=400,
            detail="Insufficient wallet balance",
        )

    # Deduct wallet
    user.wallet_balance = round(user.wallet_balance - order.price, 2)

    order.payment_method = "wallet"
    order.transaction_id = f"WALLET-{order.id}-{user_id}"
    order.status = "paid"

    await db.commit()
    await db.refresh(order)

    # Keep wallet-paid order in paid state.
    # Admin must manually approve it from Original Orders.
    # Supplier delivery is triggered only by Admin "Approve & Send".

    order.supplier_status = None
    order.supplier_order_id = None

    await db.commit()
    await db.refresh(order)

    return {
        "message": "Wallet payment successful. Order is awaiting admin approval.",
        "order_id": order.id,
        "public_order_id": order.public_order_id,
        "player_id": order.player_id,
        "game_name": order.game_name,
        "amount": order.package_amount,
        "quantity": order.quantity,
        "price": order.price,
        "payment_method": order.payment_method,
        "transaction_id": order.transaction_id,
        "payment_status": "paid",
        "order_status": order.status,
    }
