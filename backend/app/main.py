from .api.payment.wallet import router as payment_wallet_router

from fastapi.middleware.cors import CORSMiddleware

from .api.wallet import router as wallet_router
from .api.payment_accounts import router as payment_accounts_router
from .api.admin import router as admin_router
from .api.admin_games import router as admin_games_router

from .api.orders import router as orders_router

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import create_tables
from .api.users import router as users_router
from .api.auth import router as auth_router
from .api.google_auth import router as google_auth_router
from .api.games import router as games_router
from .api.gift_cards import router as gift_cards_router
from .api.admin_gift_cards import router as admin_gift_cards_router
from .api.support import router as support_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    yield


app = FastAPI(
    title="ApexGamer",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(payment_accounts_router)
app.include_router(users_router)
app.include_router(auth_router)
app.include_router(google_auth_router)
app.include_router(games_router)
app.include_router(gift_cards_router)
app.include_router(admin_gift_cards_router)
app.include_router(support_router)

app.include_router(orders_router)
app.include_router(admin_router)
app.include_router(admin_games_router)
app.include_router(wallet_router)
app.include_router(payment_wallet_router)

from .api.site_contact import router as site_contact_router
app.include_router(site_contact_router)

frontend_dir = Path(__file__).resolve().parents[2] / "frontend"


app.mount(
    "/",
    StaticFiles(
        directory=frontend_dir,
        html=True,
    ),
    name="frontend",
)
