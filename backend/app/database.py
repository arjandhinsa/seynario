from uuid import uuid4

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings


is_postgres = "postgresql" in settings.DATABASE_URL or "supabase" in settings.DATABASE_URL

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=(settings.APP_ENV == "development"),
    poolclass=NullPool if is_postgres else None,
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4()}__",
    } if is_postgres else {},
)

SessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
