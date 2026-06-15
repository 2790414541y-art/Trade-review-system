from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy import Enum as SqlEnum
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Direction(str, Enum):
    long = "long"
    short = "short"


class TradingSession(str, Enum):
    Asia = "Asia"
    London = "London"
    NewYork = "NewYork"


class TradeResult(str, Enum):
    win = "win"
    loss = "loss"
    breakeven = "breakeven"


class RiskGrade(str, Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"


class Trade(Base):
    __tablename__ = "trades"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    symbol: Mapped[str] = mapped_column(String(32), index=True, default="XAUUSD")
    direction: Mapped[Direction] = mapped_column(SqlEnum(Direction), index=True)
    entry_price: Mapped[float] = mapped_column(Float)
    stop_loss: Mapped[float | None] = mapped_column(Float, nullable=True)
    take_profit: Mapped[float | None] = mapped_column(Float, nullable=True)
    risk_reward_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    timeframe: Mapped[str | None] = mapped_column(String(20), nullable=True)
    trade_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True, nullable=True)
    session: Mapped[TradingSession | None] = mapped_column(SqlEnum(TradingSession), index=True, nullable=True)
    result: Mapped[TradeResult | None] = mapped_column(SqlEnum(TradeResult), index=True, nullable=True)
    pnl: Mapped[float | None] = mapped_column(Float, nullable=True)
    reason_for_entry: Mapped[str | None] = mapped_column(Text, nullable=True)
    emotion_before_trade: Mapped[str | None] = mapped_column(String(120), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    mt5_screenshot_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    atas_screenshot_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    analyses: Mapped[list["AIAnalysis"]] = relationship(
        back_populates="trade",
        cascade="all, delete-orphan",
        order_by="desc(AIAnalysis.created_at)",
    )


class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    trade_id: Mapped[int | None] = mapped_column(ForeignKey("trades.id", ondelete="CASCADE"), nullable=True, index=True)
    image_path: Mapped[str] = mapped_column(String(500), index=True)
    technical_analysis: Mapped[dict] = mapped_column(JSON, default=dict)
    macro_analysis: Mapped[dict] = mapped_column(JSON, default=dict)
    behavior_analysis: Mapped[dict] = mapped_column(JSON, default=dict)
    strategy_score: Mapped[int] = mapped_column(Integer, default=0)
    mistakes: Mapped[list] = mapped_column(JSON, default=list)
    strengths: Mapped[list] = mapped_column(JSON, default=list)
    suggestions: Mapped[list] = mapped_column(JSON, default=list)
    risk_grade: Mapped[RiskGrade] = mapped_column(SqlEnum(RiskGrade), default=RiskGrade.C)
    raw_response: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    trade: Mapped[Trade | None] = relationship(back_populates="analyses")
