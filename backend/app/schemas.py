from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models import Direction, RiskGrade, TradeResult, TradingSession


class TradeBase(BaseModel):
    symbol: str = "XAUUSD"
    direction: Direction
    entry_price: float
    stop_loss: float | None = None
    take_profit: float | None = None
    risk_reward_ratio: float | None = None
    timeframe: str | None = None
    trade_time: datetime | None = None
    session: TradingSession | None = None
    result: TradeResult | None = None
    pnl: float | None = None
    reason_for_entry: str | None = None
    emotion_before_trade: str | None = None
    notes: str | None = None
    image_path: str | None = None


class TradeCreate(TradeBase):
    pass


class TradeUpdate(BaseModel):
    symbol: str | None = None
    direction: Direction | None = None
    entry_price: float | None = None
    stop_loss: float | None = None
    take_profit: float | None = None
    risk_reward_ratio: float | None = None
    timeframe: str | None = None
    trade_time: datetime | None = None
    session: TradingSession | None = None
    result: TradeResult | None = None
    pnl: float | None = None
    reason_for_entry: str | None = None
    emotion_before_trade: str | None = None
    notes: str | None = None
    image_path: str | None = None


class AIAnalysisBase(BaseModel):
    image_path: str
    technical_analysis: dict[str, Any] = Field(default_factory=dict)
    macro_analysis: dict[str, Any] = Field(default_factory=dict)
    behavior_analysis: dict[str, Any] = Field(default_factory=dict)
    strategy_score: int = Field(ge=0, le=100)
    mistakes: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    risk_grade: RiskGrade
    raw_response: dict[str, Any] | None = None


class AIAnalysisOut(AIAnalysisBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    trade_id: int | None = None
    created_at: datetime


class TradeOut(TradeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    analyses: list[AIAnalysisOut] = Field(default_factory=list)


class UploadOut(BaseModel):
    filename: str
    image_path: str
    content_type: str


class AnalyzeRequest(BaseModel):
    image_path: str
    mt5_image_path: str | None = None
    atas_image_path: str | None = None
    trade_id: int | None = None
    manual_trade_data: dict[str, Any] = Field(default_factory=dict)
    macro_context: dict[str, Any] = Field(default_factory=dict)
    economic_event_warning: dict[str, Any] | None = None
    notes: str | None = None


class AnalyzeOut(AIAnalysisOut):
    pass


class StatsOut(BaseModel):
    total_trades: int
    win_rate: float
    average_risk_reward: float
    max_drawdown: float
    average_win: float
    average_loss: float
    frequent_mistakes: list[dict[str, Any]]
    losing_sessions: list[dict[str, Any]]
    losing_environments: list[dict[str, Any]]
    emotion_loss_ratio: float
    pnl_curve: list[dict[str, Any]]
    error_heatmap: list[dict[str, Any]]
    session_win_rate: list[dict[str, Any]]
    direction_win_rate: list[dict[str, Any]]


class HealthOut(BaseModel):
    status: Literal["ok"]
    app: str
