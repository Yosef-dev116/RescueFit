#!/usr/bin/env python3
"""Reproducible, synthetic paired-policy food-donation simulation (stdlib only)."""
from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass
from pathlib import Path
from statistics import mean

STORAGE = {"dry": "pantry_days", "fridge": "fridge_days", "freezer": "freezer_days"}
EPS = 1e-8
MASK = (1 << 32) - 1
DEFAULTS = {
    "days": 30, "donors": 81, "seeds": 100, "seed_start": 2026, "offer_scale": 1,
    "use_share": .30, "confirmation": .55, "radius_km": 35, "use_uncertainty": .30,
    "mix": "pei", "min_offer_kg": 2, "max_offer_kg": 25,
    "min_donor_active": .08, "max_donor_active": .30,
}
POLICIES = {"baseline": "capacity_only", "fit_only": "fit_only", "rescuefit": "rescuefit",
            "accept_all_stress_test": "accept_all"}


@dataclass(frozen=True)
class Offer:
    day: int
    donor: int
    category: str
    kg: float
    home: int


@dataclass
class Lot:
    category: str
    kg: float
    expires: int


def finite_nonnegative(value, label):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
        raise ValueError(f"{label} must be a finite nonnegative number")
    return float(value)


def read_inputs(directory):
    def load(name):
        return json.loads((directory / name).read_text(encoding="utf-8"))
    return load("agencies.json"), load("shelf_life.json"), load("impact_factors.json")


def category_weights(evidence, categories):
    weights = {key: 0.0 for key in categories}
    for group in evidence["groups"]:
        keys = group["categories"]
        shares = group["within_group_weights"]
        if len(keys) != len(shares) or (keys and not math.isclose(sum(shares), 1)):
            raise ValueError(f"Invalid allocation for {group['label']}")
        for key, share in zip(keys, shares):
            if key not in weights:
                raise ValueError(f"Unrecognized mix category: {key}")
            weights[key] += group["percent"] * share
    if not any(weights.values()):
        raise ValueError("No supported report categories")
    return weights


def read_scenario(directory):
    return tuple(json.loads((directory / name).read_text(encoding="utf-8"))
                 for name in ("scenario_config.json", "pei_evidence.json"))


def prepare(agencies, shelf, factors):
    if not agencies or not shelf:
        raise ValueError("At least one agency and shelf-life category are required")
    agency_ids = [a["id"] for a in agencies]
    if len(set(agency_ids)) != len(agency_ids):
        raise ValueError("Agency IDs must be unique")
    categories = {}
    for item in shelf:
        key = item["category"]
        if key in categories:
            raise ValueError(f"Duplicate shelf-life category: {key}")
        durations = {storage: int(finite_nonnegative(item.get(days) or 0, f"{key}.{days}")) for storage, days in STORAGE.items()}
        if not any(durations.values()):
            continue
        # Prefer shelf-stable storage, then refrigerate, then freeze. This is a
        # synthetic category routing assumption, not permission to store food.
        storage = next(s for s, days in durations.items() if days > 0)
        categories[key] = (storage, durations[storage])
    if not categories:
        raise ValueError("No category has a positive planning horizon")
    kg_per_meal = finite_nonnegative(factors["kg_per_meal"], "kg_per_meal")
    if kg_per_meal <= 0:
        raise ValueError("kg_per_meal must be positive")
    coefficients = {}
    for category in categories:
        raw = factors.get("categories", {}).get(category, {})
        # Unknown factors remain unvalued, not zeros presented as validated.
        coefficients[category] = tuple(
            None if raw.get(k) is None else finite_nonnegative(raw[k], f"{category}.{k}")
            for k in ("co2e_per_kg", "cad_per_kg")
        )
    return categories, kg_per_meal, coefficients


def mixed_bits(value):
    value &= MASK
    value = ((value ^ (value >> 16)) * 0x7FEB352D) & MASK
    value = ((value ^ (value >> 15)) * 0x846CA68B) & MASK
    return (value ^ (value >> 16)) & MASK


def draws(seed):
    state = seed & MASK
    while True:
        state = (state + 0x9E3779B9) & MASK
        yield mixed_bits(state) / (MASK + 1)


def arrivals(seed, days, donors, agencies, categories, *, config=None, weights=None):
    settings = {**DEFAULTS, **(config or {})}
    rng = draws(seed)
    homes = [int(next(rng) * agencies) for _ in range(donors)]
    low, high = settings["min_donor_active"], settings["max_donor_active"]
    probabilities = [low + next(rng) * (high - low) for _ in range(donors)]
    names = sorted(name for name in categories if not weights or weights[name] > 0)
    total_weight = sum(weights[name] for name in names) if weights else len(names)
    for day in range(1, days + 1):
        for donor, (home, probability) in enumerate(zip(homes, probabilities)):
            if next(rng) >= probability:
                continue
            choice = next(rng) * total_weight
            for name in names:
                choice -= weights[name] if weights else 1
                if choice < 0:
                    break
            size = settings["min_offer_kg"] + next(rng) * (settings["max_offer_kg"] - settings["min_offer_kg"])
            kg = math.floor(size * settings["offer_scale"] * 100 + .5) / 100
            yield Offer(day, donor, name, kg, home)


def distance(a, b):
    p, q = math.radians(a["lat"]), math.radians(b["lat"])
    dl = math.radians(b["lon"] - a["lon"])
    v = math.sin((q - p) / 2)**2 + math.cos(p) * math.cos(q) * math.sin(dl / 2)**2
    return 12742.0 * math.asin(math.sqrt(min(1, v)))


def percentile(values, fraction):
    ordered = sorted(values)
    index = (len(ordered) - 1) * fraction
    lo = int(index)
    return ordered[lo] + (ordered[min(lo + 1, len(ordered) - 1)] - ordered[lo]) * (index - lo)


def transfer_available(seed, offer, probability):
    ticket = seed ^ (offer.day * 0xB5297A4D) ^ ((offer.donor + 1) * 0x68E31DA4)
    return mixed_bits(ticket) / (MASK + 1) < probability


def neighbors_for(agencies, radius):
    paths = []
    for origin, agency in enumerate(agencies):
        nearby = [(i, distance(agency, dest)) for i, dest in enumerate(agencies) if i != origin]
        paths.append(sorted(((i, km) for i, km in nearby if km <= radius + EPS),
                            key=lambda candidate: (candidate[1], agencies[candidate[0]]["id"])))
    return paths


def demand_factors(seed, days, agencies, amplitude):
    rng = draws(seed ^ 0xD1B54A35)
    return [[1 + amplitude * (2 * next(rng) - 1) for _ in range(agencies)] for _ in range(days)]


def run_policy(offers, agencies, categories, kg_per_meal, coefficients, days, policy, *,
               redirect_probability=1.0, simulation_seed=0, use_share=.30, radius_km=50,
               actual_factors=None, neighbors=None, daily_detail=None):
    if policy not in POLICIES.values():
        raise ValueError(f"Unknown policy: {policy}")
    if not 0 <= redirect_probability <= 1:
        raise ValueError("redirect probability must be between zero and one")
    state = [{s: [] for s in STORAGE} for _ in agencies]
    free = [{
        s: min(finite_nonnegative(a["capacity_kg"].get(s, 0), f"{a['id']} capacity"),
               finite_nonnegative(a["free_kg"].get(s, 0), f"{a['id']} free space"))
        for s in STORAGE
    } for a in agencies]
    # Only a share of existing kitchen throughput is assumed available for donated food.
    demand = [finite_nonnegative(a["meals_per_day"], f"{a['id']} meals") * kg_per_meal * use_share for a in agencies]
    if neighbors is None and policy == "rescuefit":
        neighbors = neighbors_for(agencies, radius_km)
    metrics = dict.fromkeys(("kg_offered", "kg_received", "kg_wasted_at_agency", "kg_used", "kg_unallocated",
                            "kg_remaining", "kg_redirected", "meals", "co2e_kg", "cad",
                            "kg_with_co2e_factor", "kg_with_cad_factor", "transfers", "redirect_kg_km"), 0.0)
    daily = []
    offer_index = 0
    for day in range(1, days + 1):
        before = metrics.copy() if daily_detail is not None else None
        waste_today = 0.0
        for bins in state:
            for storage, lots in bins.items():
                waste_today += sum(lot.kg for lot in lots if lot.expires <= day)
                bins[storage] = [lot for lot in lots if lot.expires > day]
        while offer_index < len(offers) and offers[offer_index].day == day:
            offer = offers[offer_index]
            offer_index += 1
            metrics["kg_offered"] += offer.kg
            storage, horizon = categories[offer.category]
            expiry = day + horizon
            remaining = offer.kg
            candidates = [(offer.home, 0)]
            if policy == "rescuefit" and transfer_available(simulation_seed, offer, redirect_probability):
                candidates.extend(neighbors[offer.home])
            for idx, km in candidates:
                if remaining < EPS:
                    break
                bins = state[idx]
                available = max(0, free[idx][storage] - sum(lot.kg for lot in bins[storage]))
                if policy in {"fit_only", "rescuefit"}:
                    # Existing lots with earlier/same expiry take priority. Also
                    # reserve service capacity for later-expiring earlier donations:
                    # do not book more than cumulative service can use by ANY
                    # current deadline after inserting this lot.
                    outstanding = [lot for lots in bins.values() for lot in lots]
                    due = {expiry}
                    due.update(lot.expires for lot in outstanding if lot.expires >= expiry)
                    use_window = min(demand[idx] * (end - day)
                                     - sum(lot.kg for lot in outstanding if lot.expires <= end)
                                     for end in due)
                    available = max(0, min(available, use_window))
                received = min(remaining, available)
                if received > EPS:
                    bins[storage].append(Lot(offer.category, received, expiry))
                    metrics["kg_received"] += received
                    remaining -= received
                    if idx != offer.home:
                        metrics["kg_redirected"] += received
                        metrics["transfers"] += 1
                        metrics["redirect_kg_km"] += received * km
                        break  # One alternate recipient per offer.
            if policy == "accept_all":
                metrics["kg_received"] += remaining
                waste_today += remaining
            else:
                metrics["kg_unallocated"] += remaining
        for idx, bins in enumerate(state):
            consumption = demand[idx] * (actual_factors[day - 1][idx] if actual_factors is not None else 1)
            for lot in sorted((lot for lots in bins.values() for lot in lots), key=lambda lot: lot.expires):
                if consumption < EPS:
                    break
                used = min(lot.kg, consumption)
                lot.kg -= used
                consumption -= used
                metrics["kg_used"] += used
                co2e, cad = coefficients[lot.category]
                if co2e is not None:
                    metrics["co2e_kg"] += used * co2e
                    metrics["kg_with_co2e_factor"] += used
                if cad is not None:
                    metrics["cad"] += used * cad
                    metrics["kg_with_cad_factor"] += used
            for storage, lots in bins.items():
                bins[storage] = [lot for lot in lots if lot.kg > EPS]
        metrics["kg_wasted_at_agency"] += waste_today
        daily.append(waste_today)
        if daily_detail is not None:
            detail = {k: metrics[k] - before[k] for k in ("kg_offered", "kg_used", "kg_unallocated", "kg_redirected")}
            detail["kg_wasted_at_agency"] = waste_today
            detail["kg_remaining"] = sum(lot.kg for bins in state for lots in bins.values() for lot in lots)
            daily_detail.append(detail)
    metrics["kg_remaining"] = sum(lot.kg for bins in state for lots in bins.values() for lot in lots)
    metrics["meals"] = metrics["kg_used"] / kg_per_meal
    if not math.isclose(metrics["kg_offered"], sum(metrics[k] for k in (
        "kg_used", "kg_wasted_at_agency", "kg_unallocated", "kg_remaining"
    )), abs_tol=1e-6):
        raise RuntimeError("Mass accounting failed")
    return metrics, daily


ASSUMPTIONS = [
    "Offers, recipients, available capacity and service are synthetic. Historical counts size the reference network.",
    "The PEI profile normalizes the supported 98 reported percentage points of rescued weight into an assumed offer mix.",
    "Within-group split, offer rates, sizes, storage and remaining-use windows are scenario assumptions.",
    "Each seed gives every policy identical offers, home destinations and daily use shocks.",
    "Capacity only checks storage at the home kitchen. Fit only also checks planned use. Both use earliest deadline first.",
    "Fit + redirect can try one alternate transfer per offer after a confirmation draw. It tries nearer feasible recipients first.",
    "A modeled transfer uses same-day receipt and straight-line distance. Cold-chain logistics and costs are outside this scenario.",
    "Use is forecast with the configured share of daily kitchen throughput. Actual daily use can deviate within the selected range.",
    "Offered kg = used + expired at kitchens + unallocated + ending inventory. Redirected weight is an intermediate movement.",
    "The destination of unallocated food and the later fate of ending inventory are unknown.",
    "Meal equivalents are a mass conversion. The model has no verified PEI emissions or network cash-savings factors.",
]


def interval(values):
    return dict(mean=round(mean(values), 4), p05=round(percentile(values, .05), 4),
                p95=round(percentile(values, .95), 4))


def validate_settings(settings):
    for name, lower, upper in (("days", 1, 60), ("donors", 1, 150), ("seeds", 1, 200), ("seed_start", 0, 2**32-201)):
        value = settings[name]
        if type(value) is not int or not lower <= value <= upper:
            raise ValueError(f"{name} must be an integer from {lower} to {upper}")
    for name, lower, upper in (("offer_scale", .1, 4), ("use_share", 0, 1), ("confirmation", 0, 1),
                               ("radius_km", 0, 300), ("use_uncertainty", 0, 1),
                               ("min_offer_kg", .01, 200), ("max_offer_kg", .01, 200),
                               ("min_donor_active", 0, 1), ("max_donor_active", 0, 1)):
        if not lower <= finite_nonnegative(settings[name], name) <= upper:
            raise ValueError(f"{name} must be from {lower} to {upper}")
    if settings["mix"] not in {"pei", "uniform"} or settings["min_offer_kg"] > settings["max_offer_kg"] or settings["min_donor_active"] > settings["max_donor_active"]:
        raise ValueError("Invalid mix, weight range or activity range")


def simulate(agencies, shelf, factors, days=30, donors=81, seeds=100, seed_start=0, *, config=None, evidence=None):
    settings = {**DEFAULTS, "days": days, "donors": donors, "seeds": seeds, "seed_start": seed_start, **(config or {})}
    days, donors, seeds, seed_start = (settings[k] for k in ("days", "donors", "seeds", "seed_start"))
    validate_settings(settings)
    categories, kg_per_meal, coefficients = prepare(agencies, shelf, factors)
    weights = category_weights(evidence, categories) if evidence and settings["mix"] == "pei" else None
    if weights is None:
        settings["mix"] = "uniform"
    outcomes = {k: [] for k in POLICIES}
    day_metrics = {k: [] for k in POLICIES}
    neighbors = neighbors_for(agencies, settings["radius_km"])
    differences = []
    replay = {}
    for seed in range(seed_start, seed_start + seeds):
        offers = list(arrivals(seed, days, donors, len(agencies), categories, config=settings, weights=weights))
        realized = demand_factors(seed, days, len(agencies), settings["use_uncertainty"])
        for key, policy in POLICIES.items():
            detail = []
            result, _ = run_policy(offers, agencies, categories, kg_per_meal, coefficients, days, policy,
                                   redirect_probability=settings["confirmation"], simulation_seed=seed,
                                   use_share=settings["use_share"], actual_factors=realized, neighbors=neighbors,
                                   daily_detail=detail)
            outcomes[key].append(result)
            day_metrics[key].append(detail)
            if seed == seed_start:
                replay[key] = [{k: round(v, 4) for k, v in d.items()} for d in detail]
        base, improved = outcomes["baseline"][-1], outcomes["rescuefit"][-1]
        differences.append({
            "kg_wasted_at_agency_reduction": base["kg_wasted_at_agency"] - improved["kg_wasted_at_agency"],
            "kg_used_increase": improved["kg_used"] - base["kg_used"],
            "kg_used_increase_over_fit_only": improved["kg_used"] - outcomes["fit_only"][-1]["kg_used"],
            "kg_unallocated_reduction": base["kg_unallocated"] - improved["kg_unallocated"],
            "kg_wasted_plus_unallocated_reduction": base["kg_wasted_at_agency"] + base["kg_unallocated"] - improved["kg_wasted_at_agency"] - improved["kg_unallocated"],
        })

    def summary(rows):
        return {metric: interval([row[metric] for row in rows]) for metric in rows[0]}

    stats = {key: summary(runs) for key, runs in outcomes.items()}
    def mean_day(runs, day, metric):
        return round(mean(run[day][metric] for run in runs), 4)

    daily_aliases = {"waste": "kg_wasted_at_agency", "used": "kg_used", "unallocated": "kg_unallocated",
                     "remaining": "kg_remaining", "redirected": "kg_redirected"}
    daily = [{"day": i + 1, "offered_kg": mean_day(day_metrics["baseline"], i, "kg_offered"),
              **{f"{key}_{alias}_kg": mean_day(runs, i, metric)
                 for key, runs in day_metrics.items() for alias, metric in daily_aliases.items()}}
             for i in range(days)]
    return {
        "days": days, "donors": donors, "agencies": len(agencies), "seeds": seeds, "seed_start": seed_start,
        "model_version": 2, "settings": settings, "kg_per_meal": kg_per_meal,
        "data_status": "synthetic_scenario_not_measured",
        **{name: {metric: stats[name][metric]["mean"] for metric in stats[name]} for name in POLICIES},
        "daily": daily, "replay": replay,
        "uncertainty": {**stats, "paired_delta": summary(differences)},
        "assumptions": ASSUMPTIONS,
    }


def main():
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=root / "model/data", help="fixture and scenario input directory")
    parser.add_argument("--output", type=Path, default=root / "model/data/scenario_results.json", help="output JSON")
    parser.add_argument("--days", type=int)
    parser.add_argument("--donors", type=int)
    parser.add_argument("--seeds", type=int)
    parser.add_argument("--seed-start", type=int)
    parser.add_argument("--confirmation", type=float)
    parser.add_argument("--use-share", type=float)
    parser.add_argument("--use-uncertainty", type=float)
    parser.add_argument("--radius-km", type=float)
    parser.add_argument("--offer-scale", type=float)
    parser.add_argument("--mix", choices=("pei", "uniform"))
    args = parser.parse_args()
    config, evidence = read_scenario(args.data)
    config.update({name: vars(args)[name] for name in DEFAULTS if vars(args).get(name) is not None})
    result = simulate(*read_inputs(args.data), config=config, evidence=evidence)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(f"{args.output}: {result['seeds']} paired seeds, {result['days']} days, {result['donors']} synthetic donors, {result['agencies']} recipient records")


if __name__ == "__main__":
    main()
