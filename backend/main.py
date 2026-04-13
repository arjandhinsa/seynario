from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routes import auth, wardrobe, scenarios, outfits, shop


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.models.user import User
    from app.models.wardrobe import Garment
    from app.models.outfit import Outfit, OutfitItem
    from app.models.scenario import Scenario

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print(f"✓ {settings.APP_NAME} started — tables created")
    yield
    print(f"✓ {settings.APP_NAME} stopped")


app = FastAPI(
    title="Seynario API",
    description="Dress for the Scenario — Backend API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes — uncomment as you build them
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(wardrobe.router, prefix="/api/wardrobe", tags=["Wardrobe"])
app.include_router(scenarios.router, prefix="/api/scenarios", tags=["Scenarios"])
app.include_router(outfits.router, prefix="/api/outfits", tags=["Outfits"])
app.include_router(shop.router, prefix="/api/shop", tags=["Shop"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
