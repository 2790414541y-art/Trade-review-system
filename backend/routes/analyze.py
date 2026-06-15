from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.ai_analyzer import analyze_trade_image
from database.models import Trade


router = APIRouter(prefix="/analyze", tags=["analyze"])


class AnalyzeRequest(BaseModel):
    trade_id: int | None = None
    image_path: str | None = None
    mt5_image_path: str | None = None
    atas_image_path: str | None = None
    manual_trade_data: dict[str, Any] = Field(default_factory=dict)
    macro_context: dict[str, Any] = Field(default_factory=dict)
    economic_event_warning: dict[str, Any] | None = None
    notes: str | None = None


@router.post("")
def analyze_trade(payload: AnalyzeRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    trade = db.get(Trade, payload.trade_id) if payload.trade_id else None
    if payload.trade_id and not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    mt5_image_path = payload.mt5_image_path or payload.image_path or (trade.mt5_image_path if trade else None)
    if not mt5_image_path:
        raise HTTPException(status_code=400, detail="mt5_image_path is required")

    manual_trade_data = dict(payload.manual_trade_data)
    if trade:
        manual_trade_data = {
            "symbol": trade.symbol,
            "direction": trade.direction,
            "entry_price": trade.entry_price,
            "stop_loss": trade.stop_loss,
            "take_profit": trade.take_profit,
            "risk_reward_ratio": trade.risk_reward_ratio,
            "timeframe": trade.timeframe,
            "trade_time": trade.trade_time.isoformat() if trade.trade_time else None,
            "session": trade.session,
            "result": trade.result,
            "pnl": trade.pnl,
            "reason_for_entry": trade.reason_for_entry,
            "emotion_before_trade": trade.emotion_before_trade,
            "notes": trade.notes,
            **manual_trade_data,
        }

    analysis = analyze_trade_image(
        mt5_image_path,
        payload.macro_context,
        payload.notes,
        db,
        mt5_image_path=mt5_image_path,
        atas_image_path=payload.atas_image_path or (trade.atas_image_path if trade else None),
        manual_trade_data=manual_trade_data,
        economic_event_warning=payload.economic_event_warning,
    )

    result = analysis.model_dump(mode="json")
    if trade:
        trade.ai_analysis_result = result
        db.add(trade)
        db.commit()
        db.refresh(trade)

    return result
