# RescueFit: Team Plan (IMPAC 2026, Innovation Stream)

Team: Yosef (lead), Rama, Fahd. Team name for file names: `RescueFit`.

**Hard deadline: Fri 2026-11-20, 11:59 pm AST.** We send the email at **9:00 pm AST**. The last 3 hours are buffer only.

Read this file first. Then read your own file in `tasks/`.

---

## 1. The pitch in one breath

Food rescue moves surplus food from restaurants and stores to food banks and shelters. The receiving kitchen gets food it did not plan for. It has limited fridge space, few staff, and a short shelf life to work with. So a share of "rescued" food is wasted at the receiving end.

**RescueFit is an AI copilot for the receiving kitchen.** A volunteer snaps a photo of a donation. RescueFit says what it is, how long it lasts, and whether this kitchen can store and use it. Surplus goes to the nearest PEI agency with room. Accepted food gets a use-first menu plan before it expires.

Existing tools (FoodRescue.ca) match donors to agencies. **Nobody helps the agency decide what fits.** That gap is our product.

## 2. What we build

### Core (must ship)

| # | Feature | What the judge sees | Owner |
|---|---------|---------------------|-------|
| C1 | **Snap intake** | Photo or text ("40 sandwiches, 2 trays lasagna") becomes a list of items with category, kg, and storage type | Yosef |
| C2 | **Fit check** | Compare items with the kitchen's free fridge, freezer, and dry space, its meals per day, and its shelf life. Result: Accept / Accept part / Redirect | Yosef |
| C3 | **Redirect map** | PEI map of agencies. Surplus goes to the best agency by distance, free space, and expiry | Fahd |
| C4 | **Use-first plan** | 3-day menu and prep plan that uses the soonest-expiring items first | Yosef |
| C5 | **Impact dashboard** | kg saved, meals, kg CO2e, and CAD value, live and per scenario | Fahd |
| C6 | **PEI scenario simulation** | A 30-day simulation of a PEI network of 81 donors and 22 agencies. It compares waste without and with RescueFit | Fahd |
| C7 | **Report + exec summary** | The required submission file | Rama |

### Extra (we have a strong team, so we aim higher)

| # | Feature | Why it wins points | Owner |
|---|---------|--------------------|-------|
| X1 | **Donation forecast** | Predicts tomorrow's and next week's incoming kg, so the kitchen plans ahead. Trained on real daily kitchen-waste data | Fahd |
| X2 | **Measured AI accuracy** | We test the vision intake on about 100 labelled food photos and report the accuracy. Judges trust a measured number | Fahd |
| X3 | **Spoilage check** | Photo of produce gives Fresh / Use today / Compost | Yosef |
| X4 | **Donor text intake** | A donor texts a message in plain words, and RescueFit parses it into the same item list | Yosef |
| X5 | **Barcode lookup** | Scan a packaged item to get the product and category from Open Food Facts | Yosef (stretch) |
| X6 | **Real-world validation** | A quote or a short call with a PEI food bank or kitchen. This is the strongest proof of "Feasibility & Adoption" | Rama |
| X7 | **Business model + growth plan** | Free for nonprofits, paid by donors (tax receipts and ESG waste reports) and grants. Growth: PEI, then Atlantic Canada | Rama |
| X8 | **2-minute demo video** | Judges who do not run the app still see it work | Fahd + Yosef |
| X9 | **Pitch deck draft** | Ready for the Dec 4 finalist pitch (7 min) | Rama |

Rule: finish all Core items before you start an Extra item.

## 3. How the judges score us, and where we answer it

| Innovation criterion | Where we answer it |
|---|---|
| Problem Definition | Report section 1. HungerCount PEI and Second Harvest PEI numbers. Rama's validation quote |
| Innovation | Receiving-side fit plus AI vision. No existing tool does this. Report section 4 |
| Solution Design | Working prototype C1-C5, architecture diagram, screenshots |
| Impact & Value Creation | Simulation C6 and dashboard C5: kg, meals, CO2e, CAD |
| Feasibility & Adoption | Low cost (phone plus web app), validation X6, pilot plan, measured accuracy X2 |
| Growth & Sustainability | Business model X7, Atlantic roll-out, forecast X1 |

## 4. Tech stack

- **App:** Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel.
- **AI:** Anthropic Claude API, model `claude-sonnet-5-5` for vision and text parsing. Ask for JSON output.
- **Model and simulation:** Python 3 (pandas, numpy, scikit-learn or statsmodels) in `model/`.
- **Map:** Leaflet + OpenStreetMap tiles.
- **Docs:** Google Docs for writing together. The final file is exported to PDF.

**Secrets rule:** The API key lives only in `app/.env.local` and in Vercel settings. Never commit it. `.gitignore` already blocks `.env*`.

## 5. Folder layout (each person owns their folders)

```
app/                    Yosef owns everything here except the two pages below
app/app/impact/         Fahd owns (impact dashboard page)
app/app/network/        Fahd owns (redirect map page)
app/public/data/        Fahd writes the JSON. Yosef reads it
model/                  Fahd owns (Python simulation, forecast, accuracy test)
docs/                   Rama owns (report outline, business model, deck, sources)
tasks/                  Task file for each person
```

Do not edit another person's folder. Ask in the group chat instead.

## 6. Data contract (agree on it now, so we can build in parallel)

Fahd writes these files in `app/public/data/`. Commit a **mock version by 11:30 pm Thu**. Then the app can be built against it. Then replace it with real values.

`agencies.json`
```json
[{ "id": "upper-room-ch", "name": "Upper Room Food Bank", "town": "Charlottetown",
   "lat": 46.2382, "lon": -63.1311,
   "capacity_kg": { "fridge": 300, "freezer": 200, "dry": 1500 },
   "free_kg":     { "fridge": 80,  "freezer": 40,  "dry": 600 },
   "meals_per_day": 150, "diet_flags": ["halal-needed"] }]
```

`shelf_life.json` (from USDA FoodKeeper)
```json
[{ "category": "bread", "keywords": ["bread","bagel","bun"],
   "pantry_days": 5, "fridge_days": 10, "freezer_days": 90 }]
```

`impact_factors.json`
```json
{ "kg_per_meal": 0.54,
  "categories": { "bread": { "co2e_per_kg": 1.6, "cad_per_kg": 4.2 } },
  "sources": { "co2e": "SU-EATABLE LIFE", "cad": "StatCan 18-10-0245-01", "meal": "cite source" } }
```

`scenario_results.json`
```json
{ "days": 30, "donors": 81, "agencies": 22,
  "baseline":  { "kg_received": 0, "kg_wasted_at_agency": 0, "meals": 0, "co2e_kg": 0, "cad": 0 },
  "rescuefit": { "kg_received": 0, "kg_wasted_at_agency": 0, "meals": 0, "co2e_kg": 0, "cad": 0 },
  "daily": [{ "day": 1, "baseline_waste_kg": 0, "rescuefit_waste_kg": 0 }],
  "assumptions": ["list every assumption here"] }
```

`forecast.json`
```json
[{ "date": "2026-11-21", "predicted_kg": 120, "low_kg": 90, "high_kg": 150 }]
```

The intake API returns this item shape. All three people use it.
```json
{ "items": [{ "name": "bagels", "category": "bread", "qty": 30, "unit": "each",
              "est_kg": 3.0, "storage": "dry", "shelf_life_days": 5, "confidence": 0.86 }] }
```

## 7. Schedule (all times AST)

| When | What | Who |
|---|---|---|
| **Thu 7:00-7:45 pm** | Kickoff call. Accept GitHub invites. Read this plan and your task file | All |
| Thu 7:45-11:30 pm | Build block 1 | All |
| **Thu 11:30 pm: Checkpoint 1** | Mock data committed. App skeleton deployed. Report outline and sources list done. Each person opens a PR | All |
| Thu 11:30 pm-Fri 7:30 am | **Sleep.** Tired people make bad demos | All |
| **Fri 8:00 am** | 15-min standup: done, next, blocked | All |
| Fri 8:00 am-2:00 pm | Build block 2. Core features done by noon | All |
| **Fri 2:00 pm: Checkpoint 2** | **Numbers freeze.** Fahd sends final simulation, accuracy, and forecast numbers to Rama. No new features after this | All |
| Fri 2:00-6:00 pm | Polish, screenshots, demo video, report final draft | All |
| **Fri 6:00 pm: Checkpoint 3** | All PRs merged to `main`. App live. Report in final review | All |
| Fri 6:00-8:30 pm | Two people proof-read the report against the judging table in section 3. Export PDF. Name files | Rama + Yosef |
| **Fri 9:00 pm** | **Send the email** (see section 9) | Yosef |
| Fri 9:00-11:59 pm | Buffer. Use it only if something breaks | - |

## 8. Git workflow

1. Work on your branch: `rama` or `fahd`. Yosef works on his own branch.
2. Commit small and often, with clear messages.
3. At each checkpoint, open a pull request to `main`. Yosef reviews and merges.
4. After a merge, run `git pull origin main` on your branch to stay current.
5. Never force-push to `main`.

## 9. Submission checklist

- [ ] `Innovation_RescueFit_1_Project.pdf`: executive summary (max 1.5 pages) + report (5-10 pages)
- [ ] `Innovation_RescueFit_2_PrototypeGuide.pdf`: live link, GitHub link, screenshots, how to run
- [ ] `Innovation_RescueFit_3_ScenarioModel.pdf`: simulation method, assumptions, results, accuracy test
- [ ] `Innovation_RescueFit_4_DemoVideo`: a link to an unlisted YouTube or Drive video, not a file. This keeps the email under 25 MB
- [ ] `Innovation_RescueFit_5_BusinessModel.pdf` (optional)
- [ ] The email goes to the address in the assignment. Subject line includes `RescueFit`. Each email is 25 MB or less
- [ ] Every claim in the report has a source or our own measured number
- [ ] Link-only datasets are cited, not attached (licence rule)

## 10. Data we use (from the IMPAC dataset register)

| Use | Dataset | Licence |
|---|---|---|
| PEI problem size | Second Harvest PEI Food Recovery Network Final Report (81 donors, 22 agencies, 147,000+ meals) | Link only, cite it |
| PEI demand | Food Banks Canada HungerCount (PEI 2025: 5,350 visits, 8 food banks) | Link only, cite it |
| Agency list | PEI Food Banks directory (Upper Room) + OpenStreetMap PEI extract | Cite / ODbL |
| Shelf life | USDA FSIS FoodKeeper | Open |
| Product lookup | Open Food Facts | Open (share-alike) |
| CO2e per kg | SU-EATABLE LIFE database | Open |
| CAD per kg | StatCan retail prices 18-10-0245-01 | Open |
| Forecast training | Finland secondary school food waste 2024-25 (daily kitchen waste) + University canteen food waste (Kaggle) | Open |
| Vision accuracy test | Fruit and Vegetable Disease (Healthy vs Rotten) + Grocery Store Dataset | Open |
| Market size | StatCan Canadian Business Counts 33-10-1097-01 (PEI food service firms) | Open |
| Impact cross-check | ReFED Impact Calculator | Non-commercial, cite it |
