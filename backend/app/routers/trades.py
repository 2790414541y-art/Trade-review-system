from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud
from app.database import get_db
from app.models import TradeResult, TradingSession
from app.schemas import TradeCreate, TradeOut, TradeUpdate


router = APIRouter(tags=["trades"])


@router.post("/trade", response_model=TradeOut)
def create_trade(payload: TradeCreate, db: Session = Depends(get_db)) -> TradeOut:
    return crud.create_trade(db, payload)


@router.get("/trades", response_model=list[TradeOut])
def list_trades(
    db: Session = Depends(get_db),
    start_date: datetime | None = Query(default=None),
    end_date: datetime | None = Query(default=None),
    symbol: str | None = Query(default=None),
    result: TradeResult | None = Query(default=None),
    session: TradingSession | None = Query(default=None),
    mistake_type: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[TradeOut]:
    return crud.list_trades(
        db,
        start_date=start_date,
        end_date=end_date,
        symbol=symbol,
        result=result,
        session=session,
        mistake_type=mistake_type,
        skip=skip,
        limit=limit,
    )


@router.get("/trade/{trade_id}", response_model=TradeOut)
def get_trade(trade_id: int, db: Session = Depends(get_db)) -> TradeOut:
    trade = crud.get_trade(db, trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade


@router.patch("/trade/{trade_id}", response_model=TradeOut)
def update_trade(trade_id: int, payload: TradeUpdate, db: Session = Depends(get_db)) -> TradeOut:
    trade = crud.get_trade(db, trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return crud.update_trade(db, trade, payload)
