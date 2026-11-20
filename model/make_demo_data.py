"""Deterministic interface fixtures, not field data or food-safety advice."""
from pathlib import Path
import argparse
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "model/data"
OUT.mkdir(parents=True, exist_ok=True)

def emit(name, obj):
    (OUT / name).write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n")

towns = [("Charlottetown",46.238,-63.132),("Stratford",46.219,-63.09),
         ("Cornwall",46.233,-63.218),("Summerside",46.395,-63.79),
         ("Kensington",46.44,-63.64),("Montague",46.166,-62.648),
         ("Souris",46.355,-62.252),("Alberton",46.815,-64.067),
         ("Tignish",46.949,-64.034),("O'Leary",46.707,-64.229),
         ("Hunter River",46.356,-63.353),("Cavendish",46.491,-63.379),
         ("North Rustico",46.458,-63.309),("Borden-Carleton",46.252,-63.692),
         ("Kinkora",46.327,-63.595),("Tyne Valley",46.574,-64.024),
         ("Miscouche",46.436,-63.863),("Georgetown",46.186,-62.533),
         ("Murray Harbour",46.007,-62.481),("Cardigan",46.230,-62.624),
         ("Morell",46.415,-62.709),("St. Peters Bay",46.415,-62.584)]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--sites", type=int, default=22, choices=[10, 22])
parser.add_argument("--reset-results", action="store_true", help="replace existing scenario outputs with a placeholder")
args = parser.parse_args()
sites = towns[:args.sites]
agencies = []
for i, (town, lat, lon) in enumerate(sites, 1):
    capacity = {"fridge": 30+(i%10)*3, "freezer": 38+(i%10)*4, "dry": 50+(i%10)*6}
    agencies.append({"id":f"demo-{i:02d}","name":f"Demo kitchen {i:02d}",
      "town":town,"lat":lat,"lon":lon,"capacity_kg":capacity,
      "free_kg":{k:round(v*.55,1) for k,v in capacity.items()},
      "meals_per_day":30+3*(i%10),"diet_flags":[],"dataset_status":"synthetic",
      "coordinates_status":"approximate town center, not a facility address",
      "capacity_status":"assumed","recipient_status":"not verified; demo only"})

specs = [
    ("bread",["bread","bagel","roll","bun"],4,4,45,1.5,4.0),
    ("root_veg",["carrot","beet","turnip"],0,7,90,.4,2.5),
    ("leafy_veg",["lettuce","spinach","kale"],0,3,0,.5,5.0),
    ("fruit",["apple","pear","orange"],3,7,90,.6,3.5),
    ("berries",["berry","strawberry","blueberry"],0,2,90,1.0,9.0),
    ("potatoes",["potato"],10,0,0,.4,2.0),
    ("tomatoes",["tomato"],3,0,0,.9,5.0),
    ("broccoli",["broccoli","cauliflower"],0,3,75,.7,5.0),
    ("milk",["milk"],0,4,0,1.8,2.8),
    ("yogurt",["yogurt","yoghurt"],0,5,0,2.2,5.5),
    ("cheese",["cheese"],0,7,60,8.0,10.0),
    ("eggs",["egg"],0,7,0,3.7,6.0),
    ("canned_beans",["canned beans","chickpeas","lentils"],60,0,0,1.2,3.0),
    ("dry_grains",["rice","pasta","oats"],90,0,0,1.4,3.0),
    ("frozen_veg",["frozen peas","frozen vegetables"],0,0,90,1.2,4.0),
    ("frozen_meat",["frozen chicken","frozen meat"],0,0,60,5.0,9.0),
    ("bakery",["muffin","pastry","croissant","cookie"],2,0,0,0,0),
    ("prepared",["lasagna","sandwich","prepared meal","casserole"],0,1,0,0,0),
]
shelf = [{"category":key,"keywords":words,"pantry_days":dry,"fridge_days":cold,"freezer_days":frozen,
          "dataset_status":"Synthetic remaining-use window for the scenario model"}
         for key,words,dry,cold,frozen,_,_ in specs]
factors = {"dataset_status":"Sourced meal-equivalent convention and illustrative retail values",
    "kg_per_meal":1.2 * 0.45359237,
    "categories":{k:{"co2e_per_kg":None,"cad_per_kg":None}
                  for k, *_ in specs},
    "local_purchase_example":{"price_per_kg":2.5,"handling_cost":2,"status":"Illustrative kitchen inputs; CAD"},
    "sources":{"co2e":"PEI counterfactual and transport inputs unavailable",
               "cad":"Use documented adjustable kitchen purchase prices and marginal costs",
               "meal":"Feeding America reporting convention, 1.2 lb per meal-equivalent",
               "meal_url":"https://www.feedingamerica.org/ways-to-give/faq/about-our-claims"}}
emit("agencies.json", agencies)
emit("shelf_life.json", shelf)
emit("impact_factors.json", factors)
emit("forecast.json", [])
empty = {"kg_received":0,"kg_wasted_at_agency":0,"meals":0,"co2e_kg":0,"cad":0}
if args.reset_results or not (OUT / "scenario_results.json").is_file():
    emit("scenario_results.json", {"dataset_status":"placeholder, not simulation output","days":30,"donors":81,
    "agencies":args.sites,"baseline":empty,"rescuefit":empty,"daily":[],
    "assumptions":["No scenario output generated yet. The numeric zeroes are placeholders, not findings."]})
