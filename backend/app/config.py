from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./seynario.db"

    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Text AI — outfit recommendations and rationale
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Vision AI — identifies garments from photos
    OPENAI_VISION_MODEL: str = "gpt-4o"

    # Image storage — stores wardrobe photos
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # Upload validation
    MAX_UPLOAD_BYTES: int = 8 * 1024 * 1024  # 8 MB
    MAX_IMAGE_DIMENSION: int = 1568  # px, longest side; downscaled server-side

    # Per-user daily quotas (free tier), reset at midnight UTC
    DAILY_SCAN_LIMIT: int = 50
    DAILY_RECOMMEND_LIMIT: int = 20

    # App-wide daily OpenAI call budget (scans + recommendations combined).
    # When exhausted, AI endpoints return 503 until midnight UTC.
    GLOBAL_DAILY_AI_CALL_BUDGET: int = 500

    APP_NAME: str = "Seynario"
    APP_ENV: str = "development"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
