# public/data

Fahd owns this folder. The app reads these files server-side and validates
them against the data contract in `TEAM_PLAN.md` section 6.

## Files the app looks for

| File | Needed by | Falls back to |
|---|---|---|
| `agencies.json` | fit check, redirect map | `app/lib/fixtures/agencies.json` |
| `shelf_life.json` | intake, fit check, plan | `app/lib/fixtures/shelf_life.json` |
| `impact_factors.json` | intake categories, impact page | `app/lib/fixtures/impact_factors.json` |
| `scenario_results.json` | impact page, simulation | `app/lib/fixtures/scenario_results.json` |
| `forecast.json` | forecast panel | `app/lib/fixtures/forecast.json` |

## Check a file before you commit it

```bash
cd app
npm run validate:data
```

It prints one line per file. A file that fails the check does not crash the
app. The app quietly uses Yosef's dev fixture instead, and the numbers on the
impact page will not match the numbers on the fit page. So always run the
check.

The API responses carry the source, for example `"shelf_life_source": "data"`
or `"fixture"`. If you see `fixture` when your file is in place, the file
failed validation. Run the check to see why.

The fixtures in `app/lib/fixtures/` are development data only. Do not quote
their numbers in the report. The `sources` block in the impact factors
fixture says `PLACEHOLDER` for that reason.
