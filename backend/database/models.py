from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import declarative_base


Base = declarative_base()


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)

    symbol = Column(String(32), nullable=False, index=True, default="XAUUSD")
    direction = Column(String(10), nullable=False, index=True)
    entry_price = Column(Float, nullable=False)
    stop_loss = Column(Float, nullable=True)
    take_profit = Column(Float, nullable=True)
    risk_reward_ratio = Column(Float, nullable=True)
    timeframe = Column(String(20), nullable=False)
    trade_time = Column(DateTime(timezone=True), nullable=True, index=True)
    session = Column(String(20), nullable=True, index=True)
    result = Column(String(20), nullable=True, index=True)
    pnl = Column(Float, nullable=True)
    reason_for_entry = Column(Text, nullable=True)
    emotion_before_trade = Column(String(120), nullable=True)
    notes = Column(Text, nullable=True)

    mt5_image_path = Column(String(500), nullable=False)
    atas_image_path = Column(String(500), nullable=True)
    ai_analysis_result = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)

    def __repr__(self) -> str:
        return (
            f"Trade(id={self.id!r}, symbol={self.symbol!r}, "
            f"direction={self.direction!r}, result={self.result!r})"
        )


class EconomicEvent(Base):
    __tablename__ = "economic_events"

    id = Column(Integer, primary_key=True, index=True)

    event_name = Column(String(80), nullable=False, index=True)
    event_time = Column(DateTime(timezone=True), nullable=False, index=True)
    impact_level = Column(String(20), nullable=False, index=True)
    forecast = Column(String(80), nullable=True)
    actual = Column(String(80), nullable=True)
    previous = Column(String(80), nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)

    def __repr__(self) -> str:
        return (
            f"EconomicEvent(id={self.id!r}, event_name={self.event_name!r}, "
            f"impact_level={self.impact_level!r})"
        )
