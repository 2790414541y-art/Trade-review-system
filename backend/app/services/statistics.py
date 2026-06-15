from collections import Counter, defaultdict
from typing import Any

from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select

from app.models import Trade
from app.schemas import StatsOut


def _enum_value(value: Any) -> Any:
    return getattr(value, "value", value)


def _rate(wins: int, total: int) -> float:
    return round((wins / total) * 100, 2) if total else 0.0


def _max_drawdown(pnls: list[float]) -> float:
    equity = 0.0
    peak = 0.0
    max_dd = 0.0
    for pnl in pnls:
        equity += pnl
        peak = max(peak, equity)
        max_dd = min(max_dd, equity - peak)
    return round(abs(max_dd), 2)


def build_stats(db: Session) -> StatsOut:
    trades = list(
        db.scalars(
            select(Trade)
            .options(selectinload(Trade.analyses))
            .order_by(Trade.trade_time.asc().nullslast(), Trade.created_at.asc())
        ).all()
    )
    total = len(trades)
    wins = [trade for trade in trades if _enum_value(trade.result) == "win"]
    losses = [trade for trade in trades if _enum_value(trade.result) == "loss"]
    pnl_values = [trade.pnl or 0.0 for trade in trades]
    rr_values = [trade.risk_reward_ratio for trade in trades if trade.risk_reward_ratio is not None]

    mistake_counter: Counter[str] = Counter()
    heatmap: dict[str, Counter[str]] = defaultdict(Counter)
    losing_env_counter: Counter[str] = Counter()

    for trade in trades:
        latest_analysis = trade.analyses[0] if trade.analyses else None
        if latest_analysis:
            for mistake in latest_analysis.mistakes:
                mistake_counter[mistake] += 1
                session_key = _enum_value(trade.session) or "Unknown"
                heatmap[session_key][mistake] += 1
            macro = latest_analysis.macro_analysis or {}
            if trade.result == "loss":
                for key in ["against_macro", "against_safe_haven_sentiment", "against_rate_expectations"]:
                    if str(macro.get(key, "")).lower() in {"true", "yes", "是"}:
                        losing_env_counter[key] += 1

    session_totals: dict[str, dict[str, int]] = defaultdict(lambda: {"wins": 0, "total": 0, "losses": 0})
    direction_totals: dict[str, dict[str, int]] = defaultdict(lambda: {"wins": 0, "total": 0})
    for trade in trades:
        session_key = _enum_value(trade.session) or "Unknown"
        direction_key = _enum_value(trade.direction)
        session_totals[session_key]["total"] += 1
        direction_totals[direction_key]["total"] += 1
        if _enum_value(trade.result) == "win":
            session_totals[session_key]["wins"] += 1
            direction_totals[direction_key]["wins"] += 1
        if _enum_value(trade.result) == "loss":
            session_totals[session_key]["losses"] += 1

    emotion_losses = [
        trade for trade in losses if trade.emotion_before_trade and trade.emotion_before_trade.strip().lower() not in {"calm", "冷静", "平静"}
    ]

    running = 0.0
    pnl_curve: list[dict[str, Any]] = []
    for trade in trades:
        running += trade.pnl or 0.0
        pnl_curve.append(
            {
                "id": trade.id,
                "date": (trade.trade_time or trade.created_at).isoformat(),
                "pnl": trade.pnl or 0.0,
                "equity": round(running, 2),
            }
        )

    error_heatmap = [
        {"session": session, "mistake": mistake, "count": count}
        for session, counter in heatmap.items()
        for mistake, count in counter.items()
    ]

    return StatsOut(
        total_trades=total,
        win_rate=_rate(len(wins), total),
        average_risk_reward=round(sum(rr_values) / len(rr_values), 2) if rr_values else 0.0,
        max_drawdown=_max_drawdown(pnl_values),
        average_win=round(sum((trade.pnl or 0.0) for trade in wins) / len(wins), 2) if wins else 0.0,
        average_loss=round(sum((trade.pnl or 0.0) for trade in losses) / len(losses), 2) if losses else 0.0,
        frequent_mistakes=[{"mistake": key, "count": value} for key, value in mistake_counter.most_common(10)],
        losing_sessions=[
            {"session": key, "losses": value["losses"], "total": value["total"]}
            for key, value in sorted(session_totals.items(), key=lambda item: item[1]["losses"], reverse=True)
        ],
        losing_environments=[{"environment": key, "count": value} for key, value in losing_env_counter.most_common()],
        emotion_loss_ratio=_rate(len(emotion_losses), len(losses)),
        pnl_curve=pnl_curve,
        error_heatmap=error_heatmap,
        session_win_rate=[
            {"session": key, "win_rate": _rate(value["wins"], value["total"]), "total": value["total"]}
            for key, value in session_totals.items()
        ],
        direction_win_rate=[
            {"direction": key, "win_rate": _rate(value["wins"], value["total"]), "total": value["total"]}
            for key, value in direction_totals.items()
        ],
    )
