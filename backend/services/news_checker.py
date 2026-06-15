from datetime import datetime, timedelta, timezone
from typing import TypedDict

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from database.models import EconomicEvent


SUPPORTED_EVENT_NAMES = {
    "CPI",
    "NFP",
    "ADP",
    "PCE",
    "PMI",
    "FOMC",
    "Fed Speech",
}


class NewsWarning(TypedDict):
    high_impact: bool
    event_name: str
    minutes_left: int


def _to_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def check_high_impact_event(db: Session, now: datetime | None = None) -> NewsWarning:
    current_time = _to_aware_utc(now or datetime.now(timezone.utc))
    window_end = current_time + timedelta(minutes=30)

    stmt = (
        select(EconomicEvent)
        .where(EconomicEvent.event_name.in_(SUPPORTED_EVENT_NAMES))
        .where(EconomicEvent.event_time >= current_time)
        .where(EconomicEvent.event_time <= window_end)
        .where(func.lower(EconomicEvent.impact_level) == "high")
        .order_by(EconomicEvent.event_time.asc())
        .limit(1)
    )
    event = db.scalar(stmt)

    if not event:
        return {
            "high_impact": False,
            "event_name": "",
            "minutes_left": 0,
        }

    event_time = _to_aware_utc(event.event_time)
    minutes_left = max(0, int((event_time - current_time).total_seconds() // 60))

    return {
        "high_impact": True,
        "event_name": event.event_name,
        "minutes_left": minutes_left,
    }
