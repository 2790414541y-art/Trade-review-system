from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from app.core.config import get_settings
from app.database import engine
from app.schemas import HealthOut
from database.models import Base
from routes import analyze, trade, upload


settings = get_settings()

Base.metadata.create_all(bind=engine)


def ensure_sqlite_columns() -> None:
    if not settings.database_url.startswith("sqlite"):
        return

    inspector = inspect(engine)
    if "trades" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("trades")}
    required_columns = {
        "mt5_image_path": "VARCHAR(500)",
        "atas_image_path": "VARCHAR(500)",
        "ai_analysis_result": "JSON",
    }
    with engine.begin() as connection:
        for column_name, column_type in required_columns.items():
            if column_name not in columns:
                connection.execute(text(f"ALTER TABLE trades ADD COLUMN {column_name} {column_type}"))


ensure_sqlite_columns()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.backend_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

upload_dir = Path(settings.upload_dir)
upload_dir.mkdir(parents=True, exist_ok=True)
(upload_dir / "mt5").mkdir(parents=True, exist_ok=True)
(upload_dir / "atas").mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

app.include_router(upload.router)
app.include_router(trade.router)
app.include_router(analyze.router)


@app.get("/health", response_model=HealthOut)
def health() -> HealthOut:
    return HealthOut(status="ok", app=settings.app_name)
