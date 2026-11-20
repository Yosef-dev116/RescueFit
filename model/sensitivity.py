#!/usr/bin/env python3
"""Run paired stresses using the same seeds and demand shocks as the reference."""
import argparse
import json
from pathlib import Path

from simulate import read_inputs, read_scenario, simulate

ROOT = Path(__file__).resolve().parents[1]
CASES = {
    "No confirmed alternates": {"confirmation": 0},
    "Reference": {},
    "All eligible offers confirm": {"confirmation": 1},
    "High offers": {"offer_scale": 1.55},
    "Limited prep": {"use_share": .18, "use_uncertainty": .45},
}


def sensitivity(input_dir, seeds=None):
    data = read_inputs(input_dir)
    defaults, evidence = read_scenario(input_dir)
    if seeds is not None:
        defaults["seeds"] = seeds
    cases = []
    for label, variant in CASES.items():
        result = simulate(*data, config={**defaults, **variant}, evidence=evidence)
        cases.append({"label": label, "settings": result["settings"], "baseline": result["baseline"],
                      "fit_only": result["fit_only"], "rescuefit": result["rescuefit"],
                      "paired_delta": result["uncertainty"]["paired_delta"]})
    return {"data_status": "synthetic_sensitivity", "seeds": defaults["seeds"], "scenarios": cases}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=ROOT / "model/data")
    parser.add_argument("--output", type=Path, default=ROOT / "docs/sensitivity_results.json")
    parser.add_argument("--seeds", type=int)
    opts = parser.parse_args()
    summary = sensitivity(opts.data, opts.seeds)
    opts.output.parent.mkdir(parents=True, exist_ok=True)
    opts.output.write_text(json.dumps(summary, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    for case in summary["scenarios"]:
        delta = case["paired_delta"]["kg_used_increase"]
        print(f"{case['label']}: {delta['mean']:+,.1f} kg used ({delta['p05']:+,.1f} to {delta['p95']:+,.1f})")


if __name__ == "__main__":
    main()
