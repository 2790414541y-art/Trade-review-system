from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import engine, get_db
from database.models import Base, Trade


router = APIRouter(tags=["trade"])

Base.metadata.create_all(bind=engine)


class TradeCreate(BaseModel):
    symbol: str = "XAUUSD"
    direction: str
    entry_price: float
    stop_loss: float | None = None
    take_profit: float | None = None
    risk_reward_ratio: float | None = None
    timeframe: str
    trade_time: datetime | None = None
    session: str | None = None
    result: str | None = None
    pnl: float | None = None
    reason_for_entry: str | None = None
    emotion_before_trade: str | None = None
    notes: str | None = None
    mt5_image_path: str | None = None
    atas_image_path: str | None = None
    ai_analysis_result: dict[str, Any] | None = None


class TradeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    symbol: str
    direction: str
    entry_price: float
    stop_loss: float | None = None
    take_profit: float | None = None
    risk_reward_ratio: float | None = None
    timeframe: str
    trade_time: datetime | None = None
    session: str | None = None
    result: str | None = None
    pnl: float | None = None
    reason_for_entry: str | None = None
    emotion_before_trade: str | None = None
    notes: str | None = None
    mt5_image_path: str
    atas_image_path: str | None = None
    image_path: str | None = None
    ai_analysis_result: dict[str, Any] | None = None
    analyses: list[dict[str, Any]] = Field(default_factory=list)
    created_at: datetime


def _calculate_risk_reward(entry_price: float, stop_loss: float | None, take_profit: float | None) -> float | None:
    if stop_loss is None or take_profit is None:
        return None

    risk = abs(entry_price - stop_loss)
    reward = abs(take_profit - entry_price)
    if risk == 0:
        return None
    return round(reward / risk, 2)


@router.post("/trade", response_model=TradeResponse)
def create_trade(payload: TradeCreate, db: Session = Depends(get_db)) -> TradeResponse:
    risk_reward_ratio = payload.risk_reward_ratio
    if risk_reward_ratio is None:
        risk_reward_ratio = _calculate_risk_reward(payload.entry_price, payload.stop_loss, payload.take_profit)

    trade = Trade(
        symbol=payload.symbol,
        direction=payload.direction,
        entry_price=payload.entry_price,
        stop_loss=payload.stop_loss,
        take_profit=payload.take_profit,
        risk_reward_ratio=risk_reward_ratio,
        timeframe=payload.timeframe,
        trade_time=payload.trade_time,
        session=payload.session,
        result=payload.result,
        pnl=payload.pnl,
        reason_for_entry=payload.reason_for_entry,
        emotion_before_trade=payload.emotion_before_trade,
        notes=payload.notes,
        mt5_image_path=payload.mt5_image_path,
        atas_image_path=payload.atas_image_path,
        ai_analysis_result=payload.ai_analysis_result,
    )

    db.add(trade)
    db.commit()
    db.refresh(trade)
    return _serialize_trade(trade)


@router.get("/trades", response_model=list[TradeResponse])
def list_trades(db: Session = Depends(get_db)) -> list[TradeResponse]:
    stmt = select(Trade).order_by(Trade.created_at.desc())
    return [_serialize_trade(trade) for trade in db.scalars(stmt).all()]


@router.get("/trade/{trade_id}", response_model=TradeResponse)
def get_trade(trade_id: int, db: Session = Depends(get_db)) -> TradeResponse:
    trade = db.get(Trade, trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return _serialize_trade(trade)


def _serialize_trade(trade: Trade) -> dict[str, Any]:
    analysis = trade.ai_analysis_result
    return {
        "id": trade.id,
        "symbol": trade.symbol,
        "direction": trade.direction,
        "entry_price": trade.entry_price,
        "stop_loss": trade.stop_loss,
        "take_profit": trade.take_profit,
        "risk_reward_ratio": trade.risk_reward_ratio,
        "timeframe": trade.timeframe,
        "trade_time": trade.trade_time,
        "session": trade.session,
        "result": trade.result,
        "pnl": trade.pnl,
        "reason_for_entry": trade.reason_for_entry,
        "emotion_before_trade": trade.emotion_before_trade,
        "notes": trade.notes,
        "mt5_image_path": trade.mt5_image_path,
        "atas_image_path": trade.atas_image_path,
        "image_path": trade.mt5_image_path,
        "ai_analysis_result": analysis,
        "analyses": [analysis] if analysis else [],
        "created_at": trade.created_at,
    }
