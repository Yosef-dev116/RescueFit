# RescueFit prototype guide

Source for `Innovation_RescueFit_2_PrototypeGuide.pdf`.
IMPAC 2026, Holland College, Innovation stream. Team RescueFit.

---

## 1. Links

| What | Where |
|---|---|
| Live app | <https://rescuefit-pei.vercel.app> |
| Source code | <https://github.com/Yosef-dev116/RescueFit> |
| Demo video | _paste the unlisted video link here_ |

The live app is deployed and public. It needs no login and no API key: it
runs in demo mode, which is labelled on every page that uses it.

Two notes before this guide is sent:

- The source repository is **private** as of this writing. A judge opening
  that link gets a 404 until it is made public.
- The demo video has not been recorded, so that link is the one field
  still to fill.

---

## 2. What RescueFit does

A charity kitchen gets a pallet of donated food at the back door. Somebody
has to decide, in a few minutes, what the kitchen can actually store and
use before it spoils, and where the rest should go.

Food rescue already solves finding the food. Nobody tells the kitchen
whether it fits.

RescueFit answers that in one pass:

1. **Read the delivery.** Photograph it, or paste the donor's message.
2. **Decide line by line.** Every item is stamped **Accept**, **Accept
   part**, or **Redirect**, with the arithmetic shown.
3. **Route the surplus.** Anything that does not fit is sent to the nearest
   PEI agency that has room for it.
4. **Use it first.** A three-day menu that cooks the soonest-expiring food
   first.

The screen is built as a consignment document, the paperwork that travels
with freight, because that is the object this job already produces on
paper.

---

## 3. The decision is arithmetic, not a guess

This is the part worth checking. **The accept and redirect decisions
contain no AI at all.** They are a plain TypeScript function, `lib/fit.ts`,
with 19 unit tests of its own. The model never decides whether food fits.

Every line is tested against three limits:

| Limit | The question | Source |
|---|---|---|
| **Space** | Is there free room in the right storage type? | `free_kg` per agency |
| **Time** | Can the kitchen eat it before it expires? | `shelf_life_days` x `meals_per_day` x kg per meal |
| **Diet** | Does the agency's diet rule forbid it? | `diet_flags` per agency |

Items are sorted soonest-expiry-first and share a running space total, so
one item cannot silently claim room another already took.

This matters for a judge, and for a kitchen manager. A decision a person
cannot audit is a decision nobody will follow. Every stamp on the screen
opens to show the sentence behind it.

**Worked example, from the landing page.** Upper Room Food Bank has 80 kg
free in the fridge. The delivery offers 177.6 kg:

- 123.6 kg is kept.
- 54 kg is routed onward.
- 3 of 6 lines send something on.

The fridge lines accept 48 + 6 + 26 = 80 kg, which is exactly the free
space. That is why the milk line reads **Accept part** and not **Accept**.
The numbers on the page add up by hand, on purpose.

---

## 4. Where the AI is, and where it is not

| Feature | AI? | Notes |
|---|---|---|
| Read a photo of a delivery | Yes | Vision. Returns the item list. |
| Read a donor's text message | Yes | Same route, text input. |
| Decide accept / part / redirect | **No** | `lib/fit.ts`, pure TypeScript, 19 tests |
| Choose the agency for surplus | **No** | Distance plus free space |
| Three-day menu | Yes | The order is fixed by code, the model writes the menu |
| Spoilage check from a photo | Yes | Returns Fresh, Use today, or Compost |
| Barcode lookup | **No** | Open Food Facts, a real public API |

Two deliberate choices behind that table:

**The shelf life never comes from the model.** It is looked up in the
shared table built from the USDA FoodKeeper data. A model that guesses
"about a week" for cooked rice is a food-safety problem, not a feature.

**The menu's order is fixed by code.** The items are sorted by expiry
before the model sees them, and the prompt is told to respect that order.
The model writes the cooking, not the priority.

The spoilage check deliberately rounds down. Anything the model is unsure
about becomes "use today" and never "fresh", because this food is served
to people who have no other option.

---

## 5. Honesty about what is live

The prototype runs in **demo mode** when no API key is set. Every AI answer
is then canned, and a red badge says so on the page:

> DEMO DATA, NOT A REAL READING

Nothing is dressed up as a measured result. Pages that show simulated
figures carry the same badge. The sample data is labelled sample data.

**What is real even in demo mode:** the fit engine, every decision and
every number it produces, the landing page waybill, the barcode lookup, and
all six pages on a phone and a laptop.

With a key set, the badge changes to **LIVE MODEL READING** and the
photo-reading is genuine.

---

## 6. How to run it

### On the deployed URL

Open the live link in section 1. Nothing to install.

### On your own machine

```bash
git clone <repository url>
cd app
npm install
npm run dev
```

Open <http://localhost:3000>. It runs in demo mode, so it works with no key
and no setup.

To turn on the real model, create `app/.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
RESCUEFIT_MODEL=claude-sonnet-5-5
```

Restart, then prove the live path actually works:

```bash
npm run smoke:live
```

It calls all four model routes and fails if any of them is still answering
in demo mode.

### The checks

| Command | What it proves |
|---|---|
| `npm test` | 26 tests: 19 on the fit engine, 3 on the warning rules, 4 on this guide's own worked example |
| `npm run smoke:ui` | The waybill opens in place and the intake posts |
| `npm run smoke:live` | All four model routes answer live, and what they cost |
| `npm run validate:data` | The shared JSON matches the agreed contract |
| `npm run build` | Production build, 11 routes |

`DEPLOY.md` covers deploying, including the one setting that fails for
everybody.

---

## 7. Architecture

```
                 Volunteer at the loading door
                             |
              photo, or the donor's message pasted
                             |
                             v
            +--------------------------------+
            |  Next.js 16 App Router (Vercel) |
            +--------------------------------+
                 |                      |
                 v                      v
   +--------------------+   +------------------------+
   |  /api/intake       |   |  /api/barcode          |
   |  Claude, vision    |   |  Open Food Facts       |
   |  and text          |   |  no key needed         |
   +--------------------+   +------------------------+
                 |
       item list in the agreed shape
                 |
                 v
   +----------------------------------------------+
   |  lib/fit.ts   THE DECISION. NO AI.            |
   |  space limit, time limit, diet limit          |
   |  19 unit tests                                |
   +----------------------------------------------+
                 |                        |
      accept / accept part                | surplus
                 |                        v
                 |          +--------------------------+
                 |          |  nearest agency with room |
                 |          |  distance + free space    |
                 |          +--------------------------+
                 v
   +--------------------------+
   |  /api/plan               |
   |  Claude writes the menu  |
   |  code fixes the order    |
   +--------------------------+

   Shared data, read and validated at every boundary:
   agencies.json   shelf_life.json   impact_factors.json
```

**Stack.** Next.js 16.4.6 (App Router), TypeScript, Tailwind v4, deployed
on Vercel. Anthropic Claude for vision and text. Leaflet and OpenStreetMap
for the agency map. Zod validates every boundary.

**The data contract is enforced, not assumed.** Shared JSON is validated on
read, and falls back to a checked-in sample with a visible warning rather
than crashing or showing a wrong number.

---

## 8. What a photo costs

Claude charges an image in 28x28 pixel patches, so a picture costs
`ceil(width / 28) x ceil(height / 28)` tokens. The app resizes every upload
to 1568 px on the long edge before sending it.

| | Tokens |
|---|---|
| A 1568 x 1176 photo | 2,352 |
| Prompt and instruction | about 300 |
| The item list returned | about 500 |

| Model | Per photo | Per 100 photos |
|---|---|---|
| `claude-sonnet-5-5` | about 1.0 cent | about $1.03 |
| `claude-opus-5-5` | about 2.1 cents | about $2.06 |

These are calculated, not measured. `npm run smoke:live` prints the real
figure from the API once a key is set, and that is the number to quote in
the report.

The 1568 px setting is a cost decision, not a limit. These models accept
2,576 px. Halving the long edge to 1092 px roughly halves the bill, and
`lib/resize.ts` records the arithmetic for whoever tunes it next.

---

## 9. Screenshots

Captured from a production build at 1440x900 and 390x844.

| File | Shows |
|---|---|
| `home.png` | The landing page: the live waybill and the attachment box |
| `home-firstviewport.png` | What a visitor sees before scrolling |
| `intake.png` | Photo or message in, item list out |
| `fit.png` | The fit check, with the three storage gauges |
| `plan.png` | The three-day use-first menu |
| `impact.png` | The simulated impact figures |
| `network.png` | The PEI agency table and map |

Each has a `-mobile` version at phone width.

---

## 10. Limits, stated plainly

A prototype that hides its gaps is harder to trust than one that names
them.

- **The photo reading is not accuracy-tested yet.** The measured number
  comes from the team's accuracy script, not from this app.
- **The agency data is a sample** until the surveyed roster is published.
  Every page that uses it says so.
- **The rate limit is best effort.** It counts in memory, so each
  serverless instance counts on its own. The real control on a public
  deployment is a hard spend cap on the API key.
- **Diet matching is keyword-based.** It catches pork and gelatin in a
  halal-needed kitchen. It is not a certification.
- **Distances are great-circle.** Road distance is longer, and the app
  says so under the table.
