# Product

> The facts below come from `TEAM_PLAN.md` and `tasks/yosef.md`. Facts
> marked INFERRED are not in those files, and the team should check them.

## Platform

web

## Users

Primary user: a volunteer or kitchen staff member at a food bank or community
kitchen in Prince Edward Island that receives donated food.

Their situation: a donation arrives that they did not plan for. They are
standing at a loading door or a counter with a phone in one hand. They have
limited fridge, freezer, and dry space, few staff, and a short shelf life to
work with. They have minutes, not hours, to decide.

Their job: decide what this kitchen can store and use, and where the rest
should go, before the food spoils.

Second audience: the IMPAC 2026 judging panel at Holland College. They read a
report and a prototype guide, and they score Problem Definition, Innovation,
Solution Design, Impact and Value Creation, Feasibility and Adoption, and
Growth and Sustainability.

INFERRED: a third audience is a donor restaurant or grocer, who sends a text
message about surplus. The team plan lists donor text intake as feature X4.

## Product Purpose

RescueFit is an AI copilot for the kitchen that receives donated food.

A volunteer photographs a donation. RescueFit names the items, estimates the
weight, says how long each item lasts, and says whether this kitchen can
store and use it. Surplus is routed to the nearest PEI agency that has room.
Accepted food gets a three-day use-first menu plan.

Success: the receiving kitchen wastes less of the food that was rescued for
it, and can show the saved kilograms, meals, CO2e, and dollars.

## Positioning

Food rescue tools such as FoodRescue.ca match donors to agencies. They stop
at the match. Nobody helps the agency decide what fits.

The mechanism a neighbouring product cannot truthfully copy: the fit check
compares a specific donation against one kitchen's free space per storage
type, its meals per day, its shelf life, and its diet rules, then returns
Accept, Accept part, or Redirect with a reason a manager can check by hand.
The decision is arithmetic, not an AI opinion.

## Operating Context

- The volunteer works on a phone, standing up, often in a cold room or at a
  back door. One hand is holding food.
- Decisions are made against the clock. Prepared hot food has about three
  days in a fridge. Salad greens have about one.
- Space is counted in kilograms per storage type: fridge, freezer, dry.
- Some kitchens have diet rules, such as halal or vegetarian. An item that
  breaks the rule is worth nothing to them, however much space they have.
- Surplus moves between agencies by road. Distance in kilometres is a real
  cost, so the nearest agency with room wins.
- The team's own deadline: the IMPAC submission is due Friday 2026-11-20 at
  11:59 pm Atlantic time.

## Capabilities and Constraints

Built and working:

- Snap intake from a photo or a plain text message, returning the shared item
  shape (C1 and X4).
- The fit check, as plain TypeScript with unit tests (C2).
- A three-day use-first menu plan (C4).
- A spoilage check that returns Fresh, Use today, or Compost (X3).
- A barcode lookup against Open Food Facts (X5).

Owned by other team members, not this surface:

- The redirect map page and the impact dashboard page (Fahd).
- The Python simulation, the donation forecast, and the measured vision
  accuracy (Fahd).
- The report, the business model, and the pitch deck (Rama).

Constraints:

- Next.js App Router, TypeScript, Tailwind, deployed on Vercel.
- The Anthropic Claude API does the vision and the text parsing. The fit
  arithmetic must stay out of the model, so it stays explainable.
- Demo mode. The development machine has no API key, so every AI route can
  answer with canned data. Every response carries `mode: "demo"` or
  `mode: "live"`, and the interface must show which one the user is seeing.
- The data contract in `TEAM_PLAN.md` section 6 is fixed. Three people build
  against it in parallel.
- A phone photo is resized in the browser before upload, because Vercel caps
  a request body at about 4.5 MB.

Undecided: whether the live deployment happens, and which model the team
ships with. The pushed plan names `claude-sonnet-5-5`. This build defaults to
`claude-opus-5-5` and reads `RESCUEFIT_MODEL` to switch.

## Brand Commitments

- The product name is RescueFit. The team name for file names is also
  RescueFit.
- The team is Yosef, Rama, and Fahd.
- Rama may supply colours later. Until then the visual world is this build's
  decision.
- Every claim in the submission needs a source or the team's own measured
  number. So the interface must never present a placeholder as a result.

## Evidence on Hand

Real, cited in the team plan as link-only datasets:

- Second Harvest PEI Food Recovery Network: 81 donors, 22 agencies, more than
  147,000 meals.
- Food Banks Canada HungerCount, PEI 2025: 5,350 visits, 8 food banks.
- USDA FSIS FoodKeeper for shelf life. Open Food Facts for product lookup.
- SU-EATABLE LIFE for CO2e per kg. StatCan 18-10-0245-01 for CAD per kg.

Not yet real, and must not be presented as real:

- Every number in `app/lib/fixtures/` is development data. The impact factors
  fixture marks its sources as PLACEHOLDER for that reason.
- The simulation results, the forecast, and the vision accuracy number are
  Fahd's work and are not measured yet.
- There is no pilot customer, no testimonial, and no live user. A real quote
  from a PEI food bank is Rama's task X6 and does not exist yet.

## Product Principles

1. The decision is arithmetic the user can check. The AI reads the photo.
   The rules decide, and they show their work in one line.
2. Say which food dies first. Time, not space, is what the user forgets.
3. Never hide a fallback. A canned answer, a dev fixture, or a missing data
   file is labelled where the user is looking.
4. Built for one hand, standing up, in a cold room, in a hurry.
5. Surplus is not a failure. A redirect with a named agency and a distance is
   a win, and the interface should read that way.

## Accessibility & Inclusion

- The primary device is a phone. Touch targets and text must work at 390 px
  wide.
- INFERRED: volunteers span a wide age range, so body text stays at or above
  16 px and contrast stays at or above 4.5:1.
- Decisions must be readable without relying on colour alone. Accept, Accept
  part, and Redirect carry words, not just a green or red chip.
