import base64
import json
from pathlib import Path
from typing import Any

from openai import OpenAI
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.schemas import AIAnalysisBase
from services.news_checker import check_high_impact_event


SYSTEM_PROMPT = """
You are a professional XAUUSD trade review analyst.

You analyze a trade using a strict three-layer system:

A. Technical Analysis
- market trend
- support/resistance
- entry quality
- stop loss quality
- take profit quality
- risk reward ratio
- whether the trade follows trend

B. Macro Analysis
- DXY
- US10Y
- Fed
- CPI/NFP/PCE
- Oil
- geopolitical risks
- current economic event warning
- whether the trade is against macro
- whether the trade is against safe haven logic
- whether the trade is against rate expectation

C. Behavior Analysis
- FOMO
- revenge trade
- overtrading
- emotional trade
- early exit
- holding loss

Return strict JSON only. Do not wrap the JSON in markdown.
The response must match this schema exactly:
{
  "technical_analysis": {
    "trend": "",
    "entry_quality": "",
    "stop_loss_quality": "",
    "take_profit_quality": "",
    "risk_reward_ratio": "",
    "follow_trend": true
  },
  "macro_analysis": {
    "macro_alignment": "",
    "safe_haven_alignment": "",
    "rate_expectation_alignment": ""
  },
  "behavior_analysis": {
    "fomo_detected": false,
    "revenge_trade": false,
    "overtrading": false,
    "emotional_trade": false,
    "early_exit": false,
    "holding_loss": false
  },
  "strategy_score": 0,
  "mistakes": [],
  "strengths": [],
  "suggestions": [],
  "risk_grade": "A"
}
"""


DEFAULT_NEWS_WARNING = {
    "high_impact": False,
    "event_name": "",
    "minutes_left": 0,
}


def _strip_upload_prefix(image_path: str) -> str:
    return image_path.replace("\\", "/").removeprefix("/uploads/").removeprefix("uploads/")


def _image_to_data_url(image_path: str, upload_dir: str) -> str:
    file_path = Path(upload_dir) / _strip_upload_prefix(image_path)
    suffix = file_path.suffix.lower()
    mime = "image/png"
    if suffix in {".jpg", ".jpeg"}:
        mime = "image/jpeg"
    elif suffix == ".webp":
        mime = "image/webp"
    encoded = base64.b64encode(file_path.read_bytes()).decode("utf-8")
    return f"data:{mime};base64,{encoded}"


def _macro_context_with_news_warning(
    macro_context: dict[str, Any],
    db: Session | None,
    economic_event_warning: dict[str, Any] | None = None,
) -> dict[str, Any]:
    enriched_context = dict(macro_context)
    if economic_event_warning is not None:
        enriched_context["economic_event_warning"] = economic_event_warning
        return enriched_context

    if db is None:
        enriched_context["economic_event_warning"] = DEFAULT_NEWS_WARNING
        return enriched_context

    enriched_context["economic_event_warning"] = check_high_impact_event(db)
    return enriched_context


def _build_manual_trade_data(
    manual_trade_data: dict[str, Any] | None,
    notes: str | None,
) -> dict[str, Any]:
    data = dict(manual_trade_data or {})
    if notes and "notes" not in data:
        data["notes"] = notes
    return data


def _bool_value(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"true", "yes", "1", "y"}
    return default


def _as_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value]
    if value in (None, ""):
        return []
    return [str(value)]


def _to_float(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _score_value(value: Any) -> int:
    try:
        score = int(value)
    except (TypeError, ValueError):
        score = 0
    return max(0, min(100, score))


def _risk_grade_value(value: Any) -> str:
    grade = str(value or "C").upper()
    return grade if grade in {"A", "B", "C", "D"} else "C"


def _normalize_analysis(parsed: dict[str, Any], fallback_image_path: str) -> AIAnalysisBase:
    technical = parsed.get("technical_analysis") or {}
    macro = parsed.get("macro_analysis") or {}
    behavior = parsed.get("behavior_analysis") or {}

    normalized_technical = {
        "trend": str(technical.get("trend", technical.get("market_trend", ""))),
        "entry_quality": str(technical.get("entry_quality", "")),
        "stop_loss_quality": str(technical.get("stop_loss_quality", "")),
        "take_profit_quality": str(technical.get("take_profit_quality", "")),
        "risk_reward_ratio": str(technical.get("risk_reward_ratio", "")),
        "follow_trend": _bool_value(technical.get("follow_trend"), default=False),
    }
    normalized_macro = {
        "macro_alignment": str(macro.get("macro_alignment", "")),
        "safe_haven_alignment": str(macro.get("safe_haven_alignment", "")),
        "rate_expectation_alignment": str(macro.get("rate_expectation_alignment", "")),
    }
    normalized_behavior = {
        "fomo_detected": _bool_value(behavior.get("fomo_detected"), default=False),
        "revenge_trade": _bool_value(behavior.get("revenge_trade"), default=False),
        "overtrading": _bool_value(behavior.get("overtrading"), default=False),
        "emotional_trade": _bool_value(behavior.get("emotional_trade"), default=False),
        "early_exit": _bool_value(behavior.get("early_exit"), default=False),
        "holding_loss": _bool_value(behavior.get("holding_loss"), default=False),
    }

    strategy_score = _score_value(parsed.get("strategy_score", 0))

    return AIAnalysisBase(
        image_path=str(parsed.get("image_path") or fallback_image_path),
        technical_analysis=normalized_technical,
        macro_analysis=normalized_macro,
        behavior_analysis=normalized_behavior,
        strategy_score=strategy_score,
        mistakes=_as_list(parsed.get("mistakes")),
        strengths=_as_list(parsed.get("strengths")),
        suggestions=_as_list(parsed.get("suggestions")),
        risk_grade=_risk_grade_value(parsed.get("risk_grade", "C")),
        raw_response=parsed,
    )


def _mock_analysis(
    image_path: str,
    mt5_image_path: str,
    atas_image_path: str | None,
    manual_trade_data: dict[str, Any],
    macro_context: dict[str, Any],
) -> AIAnalysisBase:
    warning = macro_context.get("economic_event_warning", DEFAULT_NEWS_WARNING)
    notes = str(manual_trade_data.get("notes") or "")
    reason = str(manual_trade_data.get("reason_for_entry") or "")
    emotion = str(manual_trade_data.get("emotion_before_trade") or "")
    direction = str(manual_trade_data.get("direction") or "")
    risk_reward = manual_trade_data.get("risk_reward_ratio")
    pnl = _to_float(manual_trade_data.get("pnl"))
    result = str(manual_trade_data.get("result") or "")

    fomo_detected = any(keyword in f"{notes} {reason}".lower() for keyword in ["fomo", "chase", "rush"])
    emotional_trade = bool(emotion and emotion.lower() not in {"calm", "neutral"})
    holding_loss = result == "loss" and pnl is not None and pnl < 0
    high_impact = bool(warning.get("high_impact"))
    follow_trend = "trend" in reason.lower()

    mistakes = []
    if high_impact:
        mistakes.append("High-impact economic event is within the next 30 minutes")
    if fomo_detected:
        mistakes.append("Possible FOMO or chasing behavior detected")
    if emotional_trade:
        mistakes.append("Emotion before trade may have influenced execution")
    if not follow_trend:
        mistakes.append("Trend-following evidence is not explicit in manual notes")
    if risk_reward is None:
        mistakes.append("Risk reward ratio is missing")

    score = 72
    score -= 12 if high_impact else 0
    score -= 10 if fomo_detected else 0
    score -= 8 if emotional_trade else 0
    score -= 6 if not follow_trend else 0
    score -= 6 if risk_reward is None else 0
    score = max(0, min(100, score))

    if score >= 85:
        risk_grade = "A"
    elif score >= 70:
        risk_grade = "B"
    elif score >= 55:
        risk_grade = "C"
    else:
        risk_grade = "D"

    parsed = {
        "image_path": image_path,
        "technical_analysis": {
            "trend": "Requires MT5 screenshot confirmation",
            "entry_quality": "Evaluate whether entry is close to support/resistance structure or extended after impulse",
            "stop_loss_quality": "Stop loss should be beyond the invalidation structure",
            "take_profit_quality": "Take profit should align with liquidity, structure, or a defined R target",
            "risk_reward_ratio": str(risk_reward if risk_reward is not None else "missing"),
            "follow_trend": follow_trend,
        },
        "macro_analysis": {
            "macro_alignment": "High-impact event risk is active" if high_impact else "No high-impact event warning in the next 30 minutes",
            "safe_haven_alignment": "Needs DXY, US10Y, oil, and geopolitical context confirmation",
            "rate_expectation_alignment": "Needs Fed and US yield context confirmation",
        },
        "behavior_analysis": {
            "fomo_detected": fomo_detected,
            "revenge_trade": "revenge" in notes.lower(),
            "overtrading": "overtrade" in notes.lower(),
            "emotional_trade": emotional_trade,
            "early_exit": "early exit" in notes.lower(),
            "holding_loss": holding_loss,
        },
        "strategy_score": score,
        "mistakes": mistakes,
        "strengths": [
            "MT5 screenshot is available",
            "ATAS screenshot is available" if atas_image_path else "Manual trade input is available",
        ],
        "suggestions": [
            "Avoid new XAUUSD entries close to high-impact events" if high_impact else "Keep checking high-impact event risk before entry",
            "Record DXY, US10Y, Fed expectation, oil, and geopolitical backdrop before entry",
            "Write whether the trade follows trend before entering",
        ],
        "risk_grade": risk_grade,
        "input_snapshot": {
            "mt5_image_path": mt5_image_path,
            "atas_image_path": atas_image_path,
            "manual_trade_data": manual_trade_data,
            "macro_context": macro_context,
        },
        "raw_response": {"mode": "mock", "reason": "OPENAI_API_KEY is not configured"},
    }
    return _normalize_analysis(parsed, image_path)


def analyze_trade_image(
    image_path: str,
    macro_context: dict[str, Any],
    notes: str | None = None,
    db: Session | None = None,
    *,
    mt5_image_path: str | None = None,
    atas_image_path: str | None = None,
    manual_trade_data: dict[str, Any] | None = None,
    economic_event_warning: dict[str, Any] | None = None,
) -> AIAnalysisBase:
    settings = get_settings()
    mt5_path = mt5_image_path or image_path
    manual_data = _build_manual_trade_data(manual_trade_data, notes)
    enriched_macro_context = _macro_context_with_news_warning(macro_context, db, economic_event_warning)

    if not settings.openai_api_key:
        return _mock_analysis(image_path, mt5_path, atas_image_path, manual_data, enriched_macro_context)

    content: list[dict[str, Any]] = [
        {
            "type": "text",
            "text": json.dumps(
                {
                    "task": "Analyze this XAUUSD trade using the three-layer analysis system.",
                    "inputs": {
                        "mt5_screenshot_required": mt5_path,
                        "atas_screenshot_optional": atas_image_path,
                        "manual_trade_data": manual_data,
                        "macro_context": enriched_macro_context,
                    },
                },
                ensure_ascii=False,
            ),
        },
        {"type": "image_url", "image_url": {"url": _image_to_data_url(mt5_path, settings.upload_dir)}},
    ]
    if atas_image_path:
        content.append({"type": "image_url", "image_url": {"url": _image_to_data_url(atas_image_path, settings.upload_dir)}})

    client = OpenAI(api_key=settings.openai_api_key)
    completion = client.chat.completions.create(
        model=settings.openai_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": content},
        ],
    )
    parsed = json.loads(completion.choices[0].message.content or "{}")
    parsed["image_path"] = image_path
    parsed.setdefault(
        "input_snapshot",
        {
            "mt5_image_path": mt5_path,
            "atas_image_path": atas_image_path,
            "manual_trade_data": manual_data,
            "macro_context": enriched_macro_context,
        },
    )
    return _normalize_analysis(parsed, image_path)
