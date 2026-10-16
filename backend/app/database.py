from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from .config import settings
from .models import Base

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    async with SessionLocal() as session:
        yield session

def _add_missing_columns(sync_conn):
    """create_all() never adds columns to an existing table,
    so add orders.quantity once if the DB was created before it existed."""
    insp = inspect(sync_conn)
    if "orders" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("orders")}
        if "quantity" not in cols:
            sync_conn.execute(
                text("ALTER TABLE orders ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1")
            )


def _widen_price_columns(sync_conn):
    """Allow decimal prices (170.24) and text gift-card prices (650-700).
    Runs once: each column is only changed while it is still an integer."""
    insp = inspect(sync_conn)
    tables = set(insp.get_table_names())
    int_types = ("INT", "BIGINT", "SMALLINT")

    for table, column in [
        ("game_packages", "cost_price"),
        ("game_packages", "selling_price"),
        ("orders", "price"),
        ("users", "wallet_balance"),
        ("game_packages", "amount"),
        ("orders", "package_amount"),
    ]:
        if table not in tables:
            continue
        for col in insp.get_columns(table):
            if col["name"] == column and str(col["type"]).upper().startswith(int_types):
                sync_conn.execute(
                    text(f"ALTER TABLE {table} ALTER COLUMN {column} TYPE NUMERIC(12,2)")
                )

    if "gift_cards" in tables:
        for col in insp.get_columns("gift_cards"):
            if col["name"] == "selling_price" and str(col["type"]).upper().startswith(int_types):
                sync_conn.execute(
                    text("ALTER TABLE gift_cards ALTER COLUMN selling_price TYPE VARCHAR(50) USING selling_price::text")
                )


async def create_tables():
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.run_sync(_add_missing_columns)
        await connection.run_sync(_widen_price_columns)
