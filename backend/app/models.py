from datetime import datetime

from sqlalchemy import String, DateTime, Numeric
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
    )

    wallet_balance: Mapped[float] = mapped_column(
        Numeric(12, 2, asdecimal=False),
        default=0,
    )

    is_admin: Mapped[bool] = mapped_column(
    default=False,
    )  

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

class WalletDeposit(Base):
    __tablename__ = "wallet_deposits"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    user_id: Mapped[int] = mapped_column()

    amount: Mapped[int] = mapped_column()

    payment_method: Mapped[str] = mapped_column(
        String(50),
    )

    transaction_id: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="pending",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

class PaymentAccount(Base):
    __tablename__ = "payment_accounts"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    method: Mapped[str] = mapped_column(
        String(50),
    )

    account_number: Mapped[str] = mapped_column(
        String(200),
    )

    account_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    network: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    image_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        default=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )


class Game(Base):
    __tablename__ = "games"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
    )

    slug: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
    )

    image_url: Mapped[str | None] = mapped_column(
    String(500),
    nullable=True,

    )

    is_active: Mapped[bool] = mapped_column(
        default=True,
    )

class GameCurrency(Base):
    __tablename__ = "game_currencies"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    game_id: Mapped[int] = mapped_column()

    name: Mapped[str] = mapped_column(
        String(100),
    )

    symbol: Mapped[str] = mapped_column(
        String(50),
    )

    is_active: Mapped[bool] = mapped_column(
        default=True,
    )

class GamePackage(Base):
    __tablename__ = "game_packages"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    currency_id: Mapped[int] = mapped_column()

    amount: Mapped[float] = mapped_column(Numeric(12, 2, asdecimal=False))

    package_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    cost_price: Mapped[float] = mapped_column(Numeric(12, 2, asdecimal=False))

    selling_price: Mapped[float] = mapped_column(Numeric(12, 2, asdecimal=False))

    is_active: Mapped[bool] = mapped_column(
        default=True,
    )

class SupplierProductMapping(Base):
    __tablename__ = "supplier_product_mappings"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    package_id: Mapped[int] = mapped_column()

    supplier_name: Mapped[str] = mapped_column(
        String(100),
    )

    supplier_product_id: Mapped[str] = mapped_column(
        String(100),
    )

    supplier_variation_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        default=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    user_id: Mapped[int | None] = mapped_column(
    nullable=True,
    )

    package_id: Mapped[int] = mapped_column()

    payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    transaction_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    public_order_id: Mapped[str | None] = mapped_column(
    String(20),
    unique=True,
    index=True,
    nullable=True,
    )

    player_id: Mapped[str] = mapped_column(
    String(100),
    )

    game_name: Mapped[str] = mapped_column(
        String(100),
    )

    package_amount: Mapped[float] = mapped_column(Numeric(12, 2, asdecimal=False))

    price: Mapped[float] = mapped_column(Numeric(12, 2, asdecimal=False))

    quantity: Mapped[int] = mapped_column(
        default=1,
        server_default="1",
    )

    supplier_name: Mapped[str | None] = mapped_column(
    String(100),
    nullable=True,
    )

    supplier_order_id: Mapped[str | None] = mapped_column(
    String(100),
    nullable=True,
    )

    supplier_status: Mapped[str | None] = mapped_column(
    String(50),
    nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="pending",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

class GiftCard(Base):
    __tablename__ = "gift_cards"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
    )

    image_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    amount: Mapped[int] = mapped_column()

    selling_price: Mapped[str] = mapped_column(String(50))

    is_active: Mapped[bool] = mapped_column(
        default=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )


class SiteSetting(Base):
    __tablename__ = "site_settings"

    key: Mapped[str] = mapped_column(
        String(50),
        primary_key=True,
    )

    value: Mapped[str] = mapped_column(
        String(255),
        default="",
    )
