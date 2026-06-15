from datetime import datetime

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, selectinload

from app import models, schemas


def create_trade(db: Session, trade_in: schemas.TradeCreate) -> models.Trade:
    values = trade_in.model_dump()
    if values.get("image_path") and not values.get("mt5_screenshot_path"):
        values["mt5_screenshot_path"] = values["image_path"]
    trade = models.Trade(**values)
    db.add(trade)
    db.commit()
    db.refresh(trade)
    return trade


def update_trade(db: Session, trade: models.Trade, trade_in: schemas.TradeUpdate) -> models.Trade:
    values = trade_in.model_dump(exclude_unset=True)
    if values.get("image_path") and not values.get("mt5_screenshot_path"):
        values["mt5_screenshot_path"] = values["image_path"]
    for key, value in values.items():
        setattr(trade, key, value)
    db.add(trade)
    db.commit()
    db.refresh(trade)
    return trade


def get_trade(db: Session, trade_id: int) -> models.Trade | None:
    stmt = (
        select(models.Trade)
        .options(selectinload(models.Trade.analyses))
        .where(models.Trade.id == trade_id)
    )
    return db.scalar(stmt)


def list_trades(
    db: Session,
    *,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    symbol: str | None = None,
    result: models.TradeResult | None = None,
    session: models.TradingSession | None = None,
    mistake_type: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> list[models.Trade]:
    stmt: Select[tuple[models.Trade]] = select(models.Trade).options(selectinload(models.Trade.analyses))
    if start_date:
        stmt = stmt.where(models.Trade.trade_time >= start_date)
    if end_date:
        stmt = stmt.where(models.Trade.trade_time <= end_date)
    if symbol:
        stmt = stmt.where(models.Trade.symbol == symbol)
    if result:
        stmt = stmt.where(models.Trade.result == result)
    if session:
        stmt = stmt.where(models.Trade.session == session)

    trades = list(db.scalars(stmt.order_by(models.Trade.created_at.desc())).all())
    if mistake_type:
        needle = mistake_type.lower()
        trades = [
            trade
            for trade in trades
            if any(needle in mistake.lower() for analysis in trade.analyses for mistake in analysis.mistakes)
        ]
    return trades[skip : skip + limit]


def create_analysis(
    db: Session,
    *,
    trade_id: int | None,
    analysis_in: schemas.AIAnalysisBase,
) -> models.AIAnalysis:
    analysis = models.AIAnalysis(trade_id=trade_id, **analysis_in.model_dump())
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis
