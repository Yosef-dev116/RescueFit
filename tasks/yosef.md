# Yosef: Lead, AI Prototype, Integration

Branch: your own feature branch. Folder you own: `app/` (except `app/app/impact/` and `app/app/network/`, which Fahd owns).

You also run the checkpoints, review and merge PRs, and send the final email.

## Block 1: Thu 7:45-11:30 pm

### Y1. Kickoff (7:00 pm)
1. Confirm that Rama and Fahd accepted the GitHub invites.
2. Walk through `TEAM_PLAN.md`. Agree on the data contract in section 6.
3. Share the brief and dataset list links: https://hollandcollege.com/about/applied-research/impac/

### Y2. App skeleton (by 9:30 pm)
1. Create the Next.js + TypeScript + Tailwind app in `app/`.
2. Pages: `/` (landing), `/intake`, `/fit`, `/plan`. Add empty `/impact` and `/network` pages for Fahd.
3. Shared UI components: card, big-number stat, button, header with nav.
4. Deploy to Vercel. Put `ANTHROPIC_API_KEY` in Vercel settings and in `app/.env.local` only.

### Y3. Snap intake API (C1)
1. `app/app/api/intake/route.ts`: accepts an image (base64) or plain text.
2. Call Claude `claude-sonnet-5-5` with a system prompt that returns JSON in the item shape from `TEAM_PLAN.md` section 6.
3. Map each item category to `shelf_life.json` to get the shelf life.
4. Validate the JSON before you return it. On bad output, retry once, then return a clear error.

**Checkpoint 1 (11:30 pm):** Skeleton live on Vercel. Intake works on one test photo. Merge the PRs.

## Block 2: Fri 8:00 am-2:00 pm

### Y4. Fit check (C2)
1. Input: items + the chosen agency from `agencies.json`.
2. Rules: free kg per storage type, shelf life against meals per day, diet flags.
3. Output: Accept / Accept part / Redirect for each item, with a one-line reason.
4. Keep this logic in a plain TypeScript function, not in the AI. It must be explainable and testable. Write a few unit tests.

### Y5. Use-first plan (C4)
1. Sort the accepted items by expiry.
2. Ask Claude for a 3-day menu and prep list that uses the soonest-expiring items first, for N meals per day.

### Y6. Extras, in this order, only after C1, C2, and C4 work
1. X4 Donor text intake: the same intake route with text input. Add a demo button with a sample message.
2. X3 Spoilage check: a second prompt that returns Fresh / Use today / Compost.
3. X5 Barcode lookup: call the Open Food Facts API by barcode.

### Y7. Help Fahd's pages
Share the components and the chart library. Merge his PR by 2:00 pm.

**Checkpoint 2 (2:00 pm):** Feature freeze.

## Block 3: Fri 2:00-9:00 pm

1. Polish the demo path: landing, then intake, fit, plan, impact. Load it with real-looking sample photos.
2. Take screenshots for Rama by 3:00 pm.
3. Measure the AI cost per photo (tokens times price). Send the number to Rama.
4. Write `Innovation_RescueFit_2_PrototypeGuide`: live link, repo link, screenshots, how to run it, architecture diagram.
5. Record the demo video with Fahd.
6. Proof-read the report with Rama from 6:00 pm.
7. **9:00 pm: send the email.** Check the file names and that each email is 25 MB or less.
