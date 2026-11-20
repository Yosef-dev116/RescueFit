"""Evaluate simple offer forecasts on a complete dated series of offered kg."""
import argparse
import csv
from datetime import date, timedelta
import json
import math
from pathlib import Path
from statistics import mean


def read_series(path):
    values = {}
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if not {"date", "offered_kg"} <= set(reader.fieldnames or []):
            raise ValueError("Expected date and offered_kg columns.")
        for row in reader:
            day = date.fromisoformat(row["date"])
            amount = float(row["offered_kg"])
            if day in values or amount < 0 or not math.isfinite(amount):
                raise ValueError(f"Invalid or repeated day at {day}.")
            values[day] = amount
    days = sorted(values)
    if len(days) < 28 or any((b-a).days != 1 for a, b in zip(days, days[1:])):
        raise ValueError("Supply at least 28 consecutive days, with explicit zeroes for known zero-offer days.")
    return days, [values[day] for day in days]


def evaluate(days, amounts, holdout):
    if not 7 <= holdout <= len(days)-14:
        raise ValueError("Leave at least 14 training days and 7 held-out days.")
    boundary = len(days)-holdout
    losses = {"same_weekday": [], "past_week_mean": []}
    forecasts = []
    for i in range(boundary, len(days)):
        # One-day-ahead updates may use observations up to yesterday.
        seasonal = amounts[i-7]
        mean_week = mean(amounts[i-7:i])
        losses["same_weekday"].append(abs(amounts[i]-seasonal))
        losses["past_week_mean"].append(abs(amounts[i]-mean_week))
        forecasts.append({"date":days[i].isoformat(),"observed_kg":amounts[i],
                          "same_weekday_kg":seasonal,"past_week_mean_kg":mean_week})
    target = [{"date":(days[-1]+timedelta(days=j)).isoformat(),"predicted_kg":amounts[-8+j]}
              for j in range(1,8)]
    return {"method": "Same weekday last week is the prespecified seven-day forecast",
            "errors_kg_mae": {key:round(mean(value),3) for key,value in losses.items()},
            "evaluation": forecasts, "forecast_origin": days[-1].isoformat(), "forecast": target}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("series", type=Path)
    parser.add_argument("--holdout", type=int, default=14)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    result = evaluate(*read_series(args.series), args.holdout)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(result["errors_kg_mae"])


if __name__ == "__main__":
    main()
