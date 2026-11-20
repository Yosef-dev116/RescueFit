"""Extract the shortlisted catalogue rows into a versioned evidence table."""
import argparse
import json
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
REVIEW = {
    4: ("Excluded from forecast", "Finnish school waste and diners are not incoming donation offers."),
    8: ("Excluded from forecast", "Canteen disposal by category describes a different outcome from offered edible weight."),
    19: ("Possible future weight benchmark", "Weighed meal images do not establish donation weights, storage or eligibility."),
    28: ("Deferred image evaluation", "A visual quality label cannot establish microbiological safety or storage history."),
    29: ("Deferred image evaluation", "Category-labelled grocery images need a reviewed model and a holdout before scoring."),
    37: ("Optional product reference", "Product metadata does not establish eligibility. Barcode lookup is separate from intake."),
    39: ("Storage reference", "The prototype uses operator review. Model windows are explicitly synthetic."),
    43: ("Pricing reference", "Matched PEI item, period and units or kitchen invoice required. App CAD uses illustrative inputs."),
    61: ("Background only", "Food-bank visits do not measure the demand or intake capacity at a receiving kitchen."),
    66: ("Not applied", "Product footprints are not avoided PEI treatment emissions without a defined comparison."),
    68: ("Optional factor source", "Use for a documented treatment scenario. No default coefficient was applied."),
    83: ("Local disposal context", "A landfill default can misstate the comparison under PEI's separate compost collection."),
    90: ("Implemented in simulations", "Historical signups size the reference case. Chart 1 sets expected offer mix in a synthetic scenario."),
    91: ("Existing system and background", "Documented matching tools provide a comparison. No private offer data was imported."),
    92: ("Partner research only", "Directory locations do not establish capacity or receiving consent."),
    98: ("Expansion research only", "Only an eligible and reachable subset would represent potential customers."),
    100: ("Reference only", "The demo uses a schematic, approximate town centres and straight-line distance."),
    105: ("Deferred recipe discovery", "No redistribution or automatic recipe approval. The demo uses five authored meal entries."),
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--out", type=Path, default=ROOT / "model/data/impac_register_audit.json")
    opts = parser.parse_args()
    workbook = load_workbook(opts.workbook, read_only=True, data_only=True)
    sheet = workbook["Register"]
    chosen = []
    count = 0
    for row, cells in enumerate(sheet.iter_rows(values_only=True), 1):
        if row == 1 or cells[0] is None:
            continue
        count += 1
        if row in REVIEW:
            use, limit = REVIEW[row]
            url = str(cells[8]).split()[0]
            if not url.startswith("https://"):
                raise ValueError(f"Check source link on row {row}")
            chosen.append({"row": row, "source": cells[0], "register_license": cells[5],
                           "register_redistributable": cells[6], "url": url, "use": use, "limit": limit})
    workbook.close()
    if len(chosen) != len(REVIEW) or "Recovery Network" not in next(x["source"] for x in chosen if x["row"] == 90):
        raise ValueError("The workbook structure has changed. Recheck row mappings.")
    output = {"file": opts.workbook.name, "sheet": sheet.title, "entries": count, "shortlist": chosen}
    opts.out.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Reviewed {count} entries and exported {len(chosen)} shortlisted rows.")


if __name__ == "__main__":
    main()
