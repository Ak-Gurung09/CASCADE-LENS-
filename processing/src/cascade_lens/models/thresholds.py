"""Empirical rainfall thresholds for landslide triggering (L2/L3): cumulated event rainfall E against event duration D,
E = alpha * D ** beta, fitted to rainfall events that triggered dated landslides, then lowered to the chosen exceedance
level (frequentist method, Brunetti et al. 2010). An antecedent precipitation index adds the wetness before the event.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class Threshold:
    alpha: float
    beta: float
    level: float  # share of triggering events allowed below the line, such as 0.05
    n_events: int

    def rain_needed(self, duration_days: float) -> float:
        return self.alpha * duration_days ** self.beta

    def exceeds(self, event_mm: float, duration_days: float) -> bool:
        return event_mm >= self.rain_needed(duration_days)


def events(rain_mm: np.ndarray, dry_days: int = 2, wet_mm: float = 1.0) -> list[tuple[int, int, float]]:
    """Rainfall events in a daily series: runs of wet days (at least wet_mm) separated by at least dry_days dry days.
    Returns (start index, end index inclusive, total mm)."""
    r = np.nan_to_num(np.asarray(rain_mm, float))
    wet = r >= wet_mm
    out, i, n = [], 0, len(r)
    while i < n:
        if not wet[i]:
            i += 1
            continue
        start, end, gap = i, i, 0
        j = i + 1
        while j < n:
            if wet[j]:
                end, gap = j, 0
            else:
                gap += 1
                if gap >= dry_days:
                    break
            j += 1
        out.append((start, end, float(r[start:end + 1].sum())))
        i = end + 1
    return out


def fit_ed(event_mm: np.ndarray, duration_days: np.ndarray, level: float = 0.05) -> Threshold:
    """Least squares in log space, then the intercept is lowered so that `level` of the triggering events lie below."""
    e, d = np.asarray(event_mm, float), np.asarray(duration_days, float)
    ok = (e > 0) & (d > 0)
    if ok.sum() < 10:
        raise ValueError(f"{int(ok.sum())} triggering events: too few to fit a threshold (at least 10)")
    x, y = np.log10(d[ok]), np.log10(e[ok])
    beta, intercept = np.polyfit(x, y, 1)
    resid = y - (intercept + beta * x)
    shift = float(np.quantile(resid, level))
    return Threshold(alpha=float(10 ** (intercept + shift)), beta=float(beta), level=level, n_events=int(ok.sum()))


def api(rain_mm: np.ndarray, k: float = 0.9) -> np.ndarray:
    """Antecedent precipitation index: API_t = k * API_(t-1) + P_(t-1), the wetness carried into each day."""
    r = np.nan_to_num(np.asarray(rain_mm, float))
    out = np.zeros_like(r)
    for t in range(1, len(r)):
        out[t] = k * out[t - 1] + r[t - 1]
    return out
