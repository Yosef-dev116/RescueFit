# RescueFit prototype

An AI copilot for charity kitchens that receive donated food. A volunteer
photographs a delivery. RescueFit names each item, estimates the weight, reads
the shelf life, and decides **Accept**, **Accept part**, or **Redirect** for
every line, with the arithmetic shown. Surplus is routed to the nearest PEI
agency that has room for it.

Entry for IMPAC 2026 at Holland College, Innovation stream.

## Run it

```bash
cd app
npm install
npm run dev
```

Open <http://localhost:3000>.

The app runs without any API key. Every AI route then answers with canned
data and tags the reply `mode: "demo"`, and the interface shows a red
**DEMO DATA** badge. The fit check, the redirect routing, and the arithmetic
are real in both modes, because none of that is done by the model.

### Turn the model on

Put a key in `app/.env.local`, which `.gitignore` already blocks:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Use a **dedicated key in its own Anthropic Console workspace, with a hard
spend cap**. The deployed app has no accounts and no login, so anyone with
the URL can spend this key. The spend cap is the real control, not the rate
limit, which is best effort only: it lives in memory, so each serverless
instance counts on its own.

Restart the dev server, then prove it works and measure the cost:

```bash
npm run smoke:live
```

It calls text intake, photo intake, and the plan route, fails if any of them
still answers in demo mode, and prints the token cost of each call.

To use a different model, set `RESCUEFIT_MODEL=claude-sonnet-5-5`. The default
is `claude-opus-5-5`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | 19 unit tests for the fit engine |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run validate:data` | Check `public/data/*.json` against the data contract |
| `npm run smoke:live` | Prove the live model path works, and print its cost |

## How it is put together

```
app/
  app/                  Routes (Next.js App Router)
    page.tsx            Landing. Runs the real fit engine on a sample delivery
    intake/             Photo or donor message in, item list out
    fit/                The fit check, re-decided in the browser
    plan/               Three-day use-first menu
    impact/ network/    Fahd owns these
    api/intake/         C1 and X4. Photo or text to the shared item shape
    api/plan/           C4. The use-first menu
    api/spoilage/       X3. Fresh, Use today, or Compost
    api/barcode/        X5. Open Food Facts lookup. Needs no API key
  components/           The document parts: boxes, stamps, gauges, the waybill
  lib/
    schemas.ts          The data contract from TEAM_PLAN.md section 6
    fit.ts              The fit engine. Plain TypeScript, under unit test
    fit.test.ts         19 tests
    data.ts             Reads public/data, validates it, falls back to fixtures
    claude.ts           The Anthropic client, demo mode, and cost logging
    guard.ts            Input caps and a best-effort rate limit
    fixtures/           Development data. Not for the report
  public/data/          Fahd writes the real JSON here
```

### The one design rule

**The model reads. The code decides.** Claude looks at the photo and nothing
else. Free space per storage type, what the kitchen can plate before the
expiry date, diet rules, and the redirect distance are all plain arithmetic in
`lib/fit.ts`, under unit test. A kitchen manager can check any line by hand.

That is the point. A decision nobody can audit is a decision nobody will
follow, and a judge can read the rule in one file.

### How a donation is decided

Items are handled soonest-expiry first, and they share the kitchen's space.
Each line meets three limits:

1. **Space.** Free kilograms in the storage type the item needs.
2. **Time.** `shelf_life_days x meals_per_day x kg_per_meal`. A kitchen that
   serves 150 meals a day can plate about 81 kg of a one-day item, and no more.
3. **Diet.** A halal or vegetarian kitchen cannot use some items at all,
   whatever space it has.

Whatever does not fit goes to the nearest agency with room for **all** of it,
and that agency's space is then claimed, so a second line cannot be sent to the
same shelf.

## Data

`lib/data.ts` reads the JSON in `public/data/`, validates it against the
contract, and falls back to `lib/fixtures/` with a warning when a file is
missing or malformed. Every API reply reports which it used, for example
`"shelf_life_source": "data"`.

If you see `fixture` when your file is in place, the file failed validation.
Run `npm run validate:data` to see why.

**The fixtures are development data.** Do not quote their numbers in the
report. The `sources` block in `lib/fixtures/impact_factors.json` says
`PLACEHOLDER` for that reason.

## For the accuracy test (task X2)

The intake route returns `mode` on every reply. **Reject any response with
`mode: "demo"`.** A canned answer would make the measured accuracy
meaningless.

For a batch of about 100 images, turn the rate limit off **locally**:

```bash
RESCUEFIT_RATE_LIMIT=0 npm run dev
```

**Never set `RESCUEFIT_RATE_LIMIT` in the Vercel dashboard.** The risk is not
the bypass itself. It is that somebody sets it for the batch, nobody unsets
it, and the limit is then gone for the whole judging window with nothing in
the interface to show it. Run the batch against localhost, or against a
separate preview deployment with its own key.

## Credits

- Shelf life: USDA FSIS FoodKeeper.
- Product lookup: Open Food Facts, under the Open Database Licence. The report
  must credit it.
- Map tiles, when the network page ships: OpenStreetMap contributors.
