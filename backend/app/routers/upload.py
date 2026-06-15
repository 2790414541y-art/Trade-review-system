from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.config import get_settings
from app.schemas import UploadOut


router = APIRouter(prefix="/upload", tags=["upload"])

ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp"}


@router.post("", response_model=UploadOut)
async def upload_trade_image(file: UploadFile = File(...)) -> UploadOut:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only PNG, JPG, JPEG, and WEBP images are supported")

    settings = get_settings()
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(file.filename or "").suffix.lower() or ".png"
    filename = f"{uuid4().hex}{suffix}"
    target = upload_dir / filename
    target.write_bytes(await file.read())

    return UploadOut(filename=filename, image_path=f"/uploads/{filename}", content_type=file.content_type)
