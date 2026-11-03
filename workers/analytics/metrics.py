"""Versioned, explainable learning indicators. These are rules, not ML predictions."""
from math import isfinite

RULES_VERSION = "pilot-v1"


def compute_metrics(facts: dict) -> dict:
    assigned = max(0, int(facts.get("assigned_count") or 0))
    submitted = max(0, int(facts.get("submitted_count") or 0))
    on_time = max(0, int(facts.get("on_time_count") or 0))
    absences = max(0, int(facts.get("unexcused_absences") or 0))
    scores = [float(s) for s in (facts.get("published_scores") or [])
              if s is not None and isfinite(float(s)) and 0 <= float(s) <= 10]
    average = round(sum(scores) / len(scores), 2) if scores else None
    signals = []
    if absences >= 3:
        signals.append({"rule": "unexcused_absences", "observed": absences, "threshold": 3})
    if len(scores) >= 2 and average < 4:
        signals.append({"rule": "published_score_average", "observed": average, "threshold": 4, "sample_size": len(scores)})
    return {
        "homework_assigned": assigned, "homework_submitted": submitted,
        "homework_completion_rate": round(submitted / assigned * 100, 2) if assigned else None,
        "homework_on_time_rate": round(on_time / submitted * 100, 2) if submitted else None,
        "published_score_average": average, "published_score_count": len(scores),
        "unexcused_absences": absences, "support_signals": signals,
        "data_status": "available" if assigned or scores or absences else "insufficient_data",
        "data_quality": "review_required" if submitted > assigned or on_time > submitted else "valid",
    }
