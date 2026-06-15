from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud
from app.database import get_db
from app.schemas import AnalyzeOut, AnalyzeRequest
from app.services.ai_analyzer import analyze_trade_image


router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("", response_model=AnalyzeOut)
def analyze_trade(payload: AnalyzeRequest, db: Session = Depends(get_db)) -> AnalyzeOut:
    trade = crud.get_trade(db, payload.trade_id) if payload.trade_id else None
    if payload.trade_id and not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    manual_trade_data = dict(payload.manual_trade_data)
    if trade:
        manual_trade_data = {
            "symbol": trade.symbol,
            "direction": trade.direction.value if hasattr(trade.direction, "value") else trade.direction,
            "entry_price": trade.entry_price,
            "stop_loss": trade.stop_loss,
            "take_profit": trade.take_profit,
            "risk_reward_ratio": trade.risk_reward_ratio,
            "timeframe": trade.timeframe,
            "trade_time": trade.trade_time.isoformat() if trade.trade_time else None,
            "session": trade.session.value if hasattr(trade.session, "value") else trade.session,
            "result": trade.result.value if hasattr(trade.result, "value") else trade.result,
            "pnl": trade.pnl,
            "reason_for_entry": trade.reason_for_entry,
            "emotion_before_trade": trade.emotion_before_trade,
            "notes": trade.notes,
            **manual_trade_data,
        }

    analysis_in = analyze_trade_image(
        payload.image_path,
        payload.macro_context,
        payload.notes,
        db,
        mt5_image_path=payload.mt5_image_path,
        atas_image_path=payload.atas_image_path,
        manual_trade_data=manual_trade_data,
        economic_event_warning=payload.economic_event_warning,
    )
    analysis = crud.create_analysis(db, trade_id=payload.trade_id, analysis_in=analysis_in)
    return analysis
