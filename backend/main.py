import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

from app.config import settings
from app.database import engine, Base, is_postgres
from app.limiter import limiter
from app.routes import auth, wardrobe, scenarios, outfits, shop, demo, redirect_route as redirect


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seynario")


async def _apply_schema_upgrades(conn):
    """Lightweight in-place upgrades for columns added after first deploy.

    create_all only creates missing tables — it never alters existing
    ones — so additive columns are applied here. Replace with Alembic
    migrations if the schema starts changing more often.
    """
    if is_postgres:
        await conn.execute(
            text("ALTER TABLE garments ADD COLUMN IF NOT EXISTS image_hash VARCHAR(64)")
        )
    else:
        try:
            await conn.execute(text("ALTER TABLE garments ADD COLUMN image_hash VARCHAR(64)"))
        except Exception:
            pass  # column already exists


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.models.user import User
    from app.models.wardrobe import Garment
    from app.models.outfit import Outfit, OutfitItem
    from app.models.scenario import Scenario
    from app.models.library import LibraryGarment
    from app.models.demo import DemoOutfit, DemoClick
    from app.models.usage import UsageCounter

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _apply_schema_upgrades(conn)
    logger.info("%s started — tables created", settings.APP_NAME)
    yield
    logger.info("%s stopped", settings.APP_NAME)


app = FastAPI(
    title="Seynario API",
    description="Dress for the Scenario — Backend API",
    version="0.1.0",
    lifespan=lifespan,
)

# Per-IP rate limiting (slowapi). Limits are declared on the routes.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(wardrobe.router, prefix="/api/wardrobe", tags=["Wardrobe"])
app.include_router(scenarios.router, prefix="/api/scenarios", tags=["Scenarios"])
app.include_router(outfits.router, prefix="/api/outfits", tags=["Outfits"])
app.include_router(shop.router, prefix="/api/shop", tags=["Shop"])
app.include_router(demo.router, prefix="/api/demo", tags=["Demo"])
app.include_router(redirect.router, prefix="/api/r", tags=["Affiliate"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
