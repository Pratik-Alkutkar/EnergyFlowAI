"""
EnergyFlow AI – Copilot (in-memory, no DB)
"""

from __future__ import annotations

import logging
import re
from typing import Any

from app.config import get_settings
from app.data_store import get_df

logger = logging.getLogger(__name__)
settings = get_settings()

INTENTS = {
    "status":   r"\b(status|current|now|right now|latest)\b",
    "battery":  r"\b(battery|soc|charge|discharge|storage)\b",
    "price":    r"\b(price|lmp|ercot|cost|expensive|cheap)\b",
    "solar":    r"\b(solar|pv|generation|sunshine|sun)\b",
    "savings":  r"\b(sav(ing|e|ings)|optimiz|benefit)\b",
    "forecast": r"\b(forecast|predict|tomorrow|next|future|upcoming)\b",
    "demand":   r"\b(demand|load|consumption|usage|kwh)\b",
    "anomaly":  r"\b(anomal|spike|high|unusual|alert|warn)\b",
}


def _build_context() -> dict:
    df = get_df()
    if df.empty:
        return {}
    last = df.iloc[-1]
    recent = df.tail(24)
    return {
        "latest": {
            "demand_kwh":            round(float(last["demand_kwh"]), 2),
            "solar_generation_kwh":  round(float(last["solar_generation_kwh"]), 2),
            "ercot_price_mwh":       round(float(last["ercot_price_mwh"]), 2),
            "battery_soc":           round(float(last["battery_soc"]), 2),
            "action":                str(last["action"]),
            "savings":               round(float(last["savings"]), 4),
        },
        "summary_24h": {
            "avg_demand":    round(float(recent["demand_kwh"].mean()), 2),
            "total_solar":   round(float(recent["solar_generation_kwh"].sum()), 2),
            "avg_price":     round(float(recent["ercot_price_mwh"].mean()), 2),
            "peak_price":    round(float(recent["ercot_price_mwh"].max()), 2),
            "total_savings": round(float(recent["savings"].sum()), 2),
            "avg_soc":       round(float(recent["battery_soc"].mean()), 2),
        },
    }


def _rule_answer(intent: str, ctx: dict) -> str:
    s = ctx.get("summary_24h", {})
    l = ctx.get("latest", {})
    if not l:
        return "No data available yet. Please call /generate-data first."
    if intent == "status":
        return (f"Latest: Demand={l['demand_kwh']} kWh, Solar={l['solar_generation_kwh']} kWh, "
                f"Price=${l['ercot_price_mwh']}/MWh, Battery={l['battery_soc']}% ({l['action']}).")
    if intent == "battery":
        soc = l["battery_soc"]; action = l["action"]
        return (f"Battery at {soc}% SOC, currently {action}ing. "
                f"24h avg SOC: {s['avg_soc']}%. "
                f"Price is {'high' if l['ercot_price_mwh']>80 else 'moderate'} — {'discharge recommended' if l['ercot_price_mwh']>80 and soc>30 else 'hold'}.")
    if intent == "price":
        p = l["ercot_price_mwh"]
        status = "HIGH ⚠️" if p > 100 else ("elevated" if p > 60 else "normal ✅")
        return f"Current ERCOT: ${p}/MWh ({status}). 24h avg: ${s['avg_price']}/MWh, peak: ${s['peak_price']}/MWh."
    if intent == "solar":
        return f"Current solar: {l['solar_generation_kwh']} kWh. 24h total: {s['total_solar']} kWh."
    if intent == "savings":
        return f"Last hour savings: ${l['savings']}. 24h total savings: ${s['total_savings']}."
    if intent == "forecast":
        return "Visit the Forecast page for 24h demand, solar, and price predictions with confidence intervals."
    if intent == "demand":
        return f"Current demand: {l['demand_kwh']} kWh. 24h avg: {s['avg_demand']} kWh/h."
    if intent == "anomaly":
        p = l["ercot_price_mwh"]
        if p > 200: return f"⚠️ ALERT: Price ${p}/MWh — scarcity event! Discharge battery immediately."
        if p > 100: return f"⚡ Elevated price ${p}/MWh. Battery should discharge."
        return f"No anomalies. Price ${p}/MWh is normal."
    return (f"EnergyFlow AI — 24h: avg demand {s['avg_demand']} kWh/h, "
            f"avg price ${s['avg_price']}/MWh, savings ${s['total_savings']}. "
            f"Ask me about battery, price, solar, demand, savings, or forecasts.")


async def ask(question: str) -> dict[str, Any]:
    ctx = _build_context()

    if settings.openai_api_key:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            resp = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": (
                        "You are EnergyFlow AI Copilot — expert in ERCOT markets, battery storage, "
                        f"and solar. Answer concisely using this live data context:\n{ctx}"
                    )},
                    {"role": "user", "content": question},
                ],
                temperature=0.3, max_tokens=400,
            )
            answer = resp.choices[0].message.content or ""
            source = "openai"
        except Exception as exc:
            logger.warning("OpenAI failed: %s", exc)
            intent = next((k for k, p in INTENTS.items() if re.search(p, question.lower())), "general")
            answer = _rule_answer(intent, ctx)
            source = "rules"
    else:
        intent = next((k for k, p in INTENTS.items() if re.search(p, question.lower())), "general")
        answer = _rule_answer(intent, ctx)
        source = "rules"

    return {
        "question": question,
        "answer": answer,
        "source": source,
        "context_snapshot": ctx.get("latest", {}),
    }
