"""
EnergyFlow AI – Battery Optimization (in-memory, no DB)
"""

from __future__ import annotations

import logging
from typing import Any

from app.config import get_settings
from app.data_store import get_df

try:
    import pulp
    PULP_AVAILABLE = True
except ImportError:
    PULP_AVAILABLE = False

logger = logging.getLogger(__name__)
settings = get_settings()


def _optimise_lp(demands, solar, prices, cap, max_c, max_d, eff, init_soc):
    T = len(demands)
    prob = pulp.LpProblem("battery_dispatch", pulp.LpMinimize)
    charge    = [pulp.LpVariable(f"c_{t}", 0, max_c)   for t in range(T)]
    discharge = [pulp.LpVariable(f"d_{t}", 0, max_d)   for t in range(T)]
    soc       = [pulp.LpVariable(f"soc_{t}", 0, cap)   for t in range(T)]
    grid      = [pulp.LpVariable(f"g_{t}", 0)           for t in range(T)]
    price_kwh = [p / 1000 for p in prices]

    prob += pulp.lpSum(grid[t] * price_kwh[t] for t in range(T))

    init_kwh = init_soc / 100 * cap
    for t in range(T):
        net = demands[t] - solar[t]
        prob += grid[t] + discharge[t] * eff == net + charge[t] / eff
        prob += soc[t] == (init_kwh if t == 0 else soc[t-1]) + charge[t] * eff - discharge[t]
        prob += soc[t] >= 0.10 * cap
        prob += soc[t] <= 0.90 * cap
        prob += grid[t] >= 0

    prob.solve(pulp.PULP_CBC_CMD(msg=0))
    if pulp.LpStatus[prob.status] not in ("Optimal", "Feasible"):
        return None

    results, total_opt, total_base = [], 0, 0
    for t in range(T):
        c = max(pulp.value(charge[t]) or 0, 0)
        d = max(pulp.value(discharge[t]) or 0, 0)
        s = max(pulp.value(soc[t]) or 0, 0)
        g = max(pulp.value(grid[t]) or 0, 0)
        net = max(demands[t] - solar[t], 0)
        cb = net * price_kwh[t]
        co = g * price_kwh[t]
        total_base += cb; total_opt += co
        results.append({
            "hour": t, "charge_kw": round(c,3), "discharge_kw": round(d,3),
            "battery_soc_pct": round(s/cap*100,2), "grid_import_kwh": round(g,3),
            "cost_no_battery": round(cb,4), "cost_with_battery": round(co,4),
            "savings": round(cb-co,4),
            "action": "charge" if c>0.1 else ("discharge" if d>0.1 else "idle"),
            "price_mwh": round(prices[t],4), "demand_kwh": round(demands[t],3), "solar_kwh": round(solar[t],3),
        })
    return _wrap(results, total_base, total_opt, "PuLP_LP", pulp.LpStatus[prob.status])


def _optimise_rules(demands, solar, prices, cap, max_c, max_d, eff, init_soc):
    soc_pct = init_soc
    sorted_p = sorted(prices)
    p25 = sorted_p[len(sorted_p)//4]
    p75 = sorted_p[3*len(sorted_p)//4]
    results, total_opt, total_base = [], 0, 0
    price_kwh = [p/1000 for p in prices]

    for t in range(len(demands)):
        net = max(demands[t]-solar[t], 0)
        cb = net * price_kwh[t]
        total_base += cb
        charge = discharge = 0.0
        action = "idle"
        if prices[t] <= p25 and soc_pct < 90:
            charge = min(max_c, cap*(90-soc_pct)/100)
            soc_pct = min(soc_pct + (charge*eff/cap)*100, 100)
            action = "charge"
        elif prices[t] >= p75 and soc_pct > 20:
            discharge = min(max_d, cap*(soc_pct-20)/100)
            soc_pct = max(soc_pct - (discharge/cap)*100, 0)
            action = "discharge"
        g = max(net + charge/eff - discharge*eff, 0)
        co = g * price_kwh[t]
        total_opt += co
        results.append({
            "hour": t, "charge_kw": round(charge,3), "discharge_kw": round(discharge,3),
            "battery_soc_pct": round(soc_pct,2), "grid_import_kwh": round(g,3),
            "cost_no_battery": round(cb,4), "cost_with_battery": round(co,4),
            "savings": round(cb-co,4), "action": action,
            "price_mwh": round(prices[t],4), "demand_kwh": round(demands[t],3), "solar_kwh": round(solar[t],3),
        })
    return _wrap(results, total_base, total_opt, "Rule-based", "Feasible")


def _wrap(results, base, opt, solver, status):
    return {
        "solver": solver, "status": status,
        "total_cost_baseline":  round(base, 4),
        "total_cost_optimized": round(opt, 4),
        "total_savings":        round(base-opt, 4),
        "savings_pct":          round((base-opt)/max(base,1e-9)*100, 2),
        "schedule": results,
    }


def optimise_battery(hours: int = 24, initial_soc_pct: float = 50.0) -> dict[str, Any]:
    df = get_df()
    if df.empty:
        return {"error": "No data — call /generate-data first"}

    recent = df.tail(hours)
    demands = recent["demand_kwh"].tolist()
    solar   = recent["solar_generation_kwh"].tolist()
    prices  = recent["ercot_price_mwh"].tolist()

    cap   = settings.battery_capacity_kwh
    max_c = settings.battery_max_charge_kw
    max_d = settings.battery_max_discharge_kw
    eff   = settings.battery_efficiency

    result = None
    if PULP_AVAILABLE:
        result = _optimise_lp(demands, solar, prices, cap, max_c, max_d, eff, initial_soc_pct)
    if result is None:
        result = _optimise_rules(demands, solar, prices, cap, max_c, max_d, eff, initial_soc_pct)

    for i, row in enumerate(result["schedule"]):
        if i < len(recent):
            row["timestamp"] = str(recent.iloc[i]["timestamp"])
    return result
