# Fahd: Data, Simulation, Impact, Map

Branch: `fahd`. Folders you own: `model/`, `app/public/data/`, `app/app/impact/`, `app/app/network/`.

Your job is to make our impact **measurable and believable**. The judges score "Impact & Value Creation" and "Feasibility". Your numbers carry both.

Read `TEAM_PLAN.md` sections 2, 6, and 7 first.

## Setup (10 min)

1. Accept the GitHub invite to `Yosef-dev116/RescueFit`.
2. Clone the repo and check out your branch:
   ```bash
   git clone https://github.com/Yosef-dev116/RescueFit.git
   cd RescueFit && git checkout fahd
   ```
3. Make a Python environment:
   ```bash
   python3 -m venv model/.venv && source model/.venv/bin/activate
   pip install pandas numpy scikit-learn statsmodels matplotlib jupyter
   ```

## Block 1: Thu 7:45-11:30 pm

### F1. Mock data contract (do this first, by 9:00 pm)
1. Create the five JSON files in `app/public/data/`, as shown in `TEAM_PLAN.md` section 6.
2. Use mock but realistic values. Make 8-10 PEI agencies with real town names and real coordinates.
3. Commit and push. Tell Yosef in the chat. He builds against these files.

### F2. Real agency list
1. Get the agency names and towns from the PEI Food Banks directory (Upper Room) and the OSM PEI extract.
2. Get the coordinates from OpenStreetMap.
3. Capacity values are not public. Estimate them with a clear rule, for example from the meals per day. Write the rule in `model/ASSUMPTIONS.md`.

### F3. Real factor tables
1. `shelf_life.json`: from USDA FoodKeeper. Keep 15-25 common donation categories: bread, produce, dairy, prepared meals, meat, canned, and so on.
2. `impact_factors.json`: CO2e per kg from SU-EATABLE LIFE, CAD per kg from StatCan 18-10-0245-01, and kg per meal with a cited source.
3. Put the source of every number in `sources`.

**Checkpoint 1 (11:30 pm):** Open a PR with F1-F3.

## Block 2: Fri 8:00 am-2:00 pm

### F4. PEI scenario simulation (core, highest priority)
Build `model/simulate.py`. It writes `scenario_results.json`.

1. Model 81 donors and 22 agencies over 30 days.
2. Each day, donors send random donations. Use the food mix from the Second Harvest PEI report.
3. **Baseline:** each agency accepts everything. Food above its free space, or past its shelf life, counts as wasted.
4. **RescueFit:** the agency accepts only what fits. Surplus goes to the nearest agency with room. Food is used soonest-expiry first.
5. Run each case 100 times with different random seeds. Report the mean and a 90% range.
6. Calibrate: the total meals over a year should be near the scale of the Second Harvest report (147,000+ meals over about 14 months).
7. Output: kg wasted at agencies, meals, kg CO2e, CAD, for baseline and RescueFit.
8. List every assumption in `scenario_results.json` and in `model/ASSUMPTIONS.md`.

### F5. Donation forecast (extra X1)
1. Train on the Finland school daily kitchen-waste data and the university canteen data. Use them as a stand-in for the daily surplus a kitchen donates.
2. Features: day of week, month, diners, holidays. Add PEI weather if there is time.
3. Compare a simple baseline (same weekday last week) with your model. Report MAE for both.
4. Write `forecast.json` for the next 7 days.

### F6. Vision accuracy test (extra X2)
1. Take about 100 labelled images: 50 from Healthy vs Rotten, 50 from the Grocery Store Dataset.
2. Run them through Yosef's intake API (`/api/intake`) or the same prompt.
3. Report: category accuracy, and fresh-vs-rotten accuracy. Save a confusion matrix image.
4. Be honest. A real 82% is better than a claimed 99%.

### F7. Impact page and map page
1. `app/app/impact/page.tsx`: big numbers (kg saved, meals, CO2e, CAD), a baseline-vs-RescueFit bar chart, and the daily waste line chart. Read from `scenario_results.json`.
2. `app/app/network/page.tsx`: Leaflet map of agencies. Colour by free space. Show where a redirect goes.
3. Ask Yosef for the shared UI components, so the style matches.

**Checkpoint 2 (2:00 pm):** **Numbers freeze.** Send Rama a short table with the final numbers, and open a PR.

## Block 3: Fri 2:00-6:00 pm

1. Write `Innovation_RescueFit_3_ScenarioModel` (2-4 pages): method, assumptions, results, forecast MAE, accuracy test, limits.
2. Record the 2-minute demo video with Yosef (X8). Script: problem 15 s, snap intake 30 s, fit and redirect 30 s, plan 15 s, impact 30 s.
3. Make PNG charts for Rama's report.

## Ready-to-use AI prompts

Simulation scaffold:
> Write a Python script `simulate.py`. It simulates 30 days of food donations from 81 donors to 22 food agencies in PEI. Load agencies from `app/public/data/agencies.json` and shelf life from `shelf_life.json`. Compare two policies. Baseline: accept all, and waste what exceeds free storage or passes shelf life. RescueFit: accept what fits, redirect surplus to the nearest agency with free space (haversine distance), and use soonest-expiry first. Run 100 seeds. Output mean and 5th-95th percentile for kg wasted, meals (0.54 kg per meal), CO2e, and CAD, using `impact_factors.json`. Write `scenario_results.json` in the given schema. Keep functions small and testable.

Forecast:
> I have a CSV with one row per school day: date, diners, kitchen and serving waste kg. Build a 7-day forecast of daily kg. Compare a seasonal-naive baseline (same weekday last week) against a gradient-boosting model with day of week, month, and diners. Use time-based train/test split. Report MAE for both, and plot actual vs predicted.

## Rules
- Do not commit link-only datasets. Commit only open data, or a script that downloads it.
- Every number in your outputs must trace back to a source or an assumption written down.
