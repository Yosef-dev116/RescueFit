# Scenario model

Fahd's PEI scenario model. It compares three policies over a synthetic
30-day network: storage only, kitchen fit, and fit + redirect. The
assumptions are in `ASSUMPTIONS.md`.

The model reads its inputs from `model/data/`, not from `app/public/data/`.
The app reads `app/public/data/`, and its loaders would pick up any file
there. The model's agency and shelf-life files use other category names, so
they stay out of the app.

## Run it

Python 3.10 or later and Node 20 or later. No packages are needed.

1. Run the tests: `python3 -m unittest discover -s model -p 'test_*.py'`
2. Run the scenario: `python3 model/simulate.py`
3. Copy the result into the app: `cp model/data/scenario_results.json app/public/data/`
4. Rebuild the impact lab page: `python3 model/build_demo.py`
5. Run the page checks: `node --test model/test_workspace.cjs`

Step 4 writes `app/public/rescuefit/index.html`, which the app serves at
`/rescuefit/index.html`. It also writes `demo/index.html`, which git ignores.

The seed is fixed, so step 2 gives the same file every time.
