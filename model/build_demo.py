"""Build the offline app and its static deployable copy from one set of sources."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEMO = ROOT / "demo"
DATA = ROOT / "model/data"


def read(relative):
    return (DATA / relative).read_text(encoding="utf-8")


def build():
    filenames = {"kitchen": "kitchen_demo.json", "config": "scenario_config.json",
                 "agencies": "agencies.json", "evidence": "pei_evidence.json", "shelf": "shelf_life.json",
                 "factors": "impact_factors.json", "reference": "scenario_results.json"}
    fixtures = {name: json.loads(read(path)) for name, path in filenames.items()}
    fixtures["register"] = json.loads(read("impac_register_audit.json"))["shortlist"]
    if fixtures["reference"].get("model_version") != 2 or fixtures["reference"].get("settings") != fixtures["config"]:
        raise SystemExit("Generate a current reference by running model/simulate.py first.")
    if fixtures["reference"]["agencies"] != len(fixtures["agencies"]):
        raise SystemExit("The simulation result was built for a different network.")
    both = (DEMO / "template.html").read_text(encoding="utf-8")
    replacements = {"STYLE": (DEMO / "workspace.css").read_text(encoding="utf-8"),
                    "FIXTURES": json.dumps(fixtures, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c"),
                    "SIM": (DEMO / "simulation.js").read_text(encoding="utf-8"),
                    "DECISION": (DEMO / "decision.js").read_text(encoding="utf-8"),
                    "PLOTS": (DEMO / "plots.js").read_text(encoding="utf-8"),
                    "INTERFACE": (DEMO / "workspace.js").read_text(encoding="utf-8")}
    for marker, content in replacements.items():
        token = f"/* RESCUEFIT_{marker} */"
        if both.count(token) != 1:
            raise ValueError(f"Check template marker {token}")
        both = both.replace(token, content)
    for target in (DEMO / "index.html", ROOT / "app/public/rescuefit/index.html"):
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(both, encoding="utf-8")
        print(f"Built {target.relative_to(ROOT)} ({target.stat().st_size:,} bytes)")


if __name__ == "__main__":
    build()
