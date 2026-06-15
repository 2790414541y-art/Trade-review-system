from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile


router = APIRouter(prefix="/upload", tags=["upload"])

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg"}
ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg"}
UPLOAD_ROOT = Path("uploads")
MT5_UPLOAD_DIR = UPLOAD_ROOT / "mt5"
ATAS_UPLOAD_DIR = UPLOAD_ROOT / "atas"


def _validate_image(file: UploadFile) -> str:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only png, jpg, and jpeg files are supported")
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only png, jpg, and jpeg images are supported")
    return suffix


async def _save_upload(file: UploadFile, upload_dir: Path) -> str:
    suffix = _validate_image(file)
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{suffix}"
    target = upload_dir / filename
    target.write_bytes(await file.read())
    return f"/uploads/{upload_dir.name}/{filename}"


@router.post("")
async def upload_trade_images(
    mt5_image: UploadFile = File(...),
    atas_image: UploadFile | None = File(default=None),
) -> dict[str, str | None]:
    mt5_path = await _save_upload(mt5_image, MT5_UPLOAD_DIR)
    atas_path = await _save_upload(atas_image, ATAS_UPLOAD_DIR) if atas_image else None

    return {
        "mt5_path": mt5_path,
        "atas_path": atas_path,
    }
