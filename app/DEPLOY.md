# Deploy RescueFit

**It is already deployed: <https://rescuefit-pei.vercel.app>**

That URL is public, needs no login, and runs in demo mode. The steps below
are for redeploying, for adding a key, and for whoever picks this up next.

Read this once before you start. Step 2 is the one that fails for everybody.

## What you get without an API key

Deploying needs no key. The app runs in demo mode, every AI answer is
canned, and a red badge on the page says so. A judge can open the URL and
use the whole prototype.

What is real in demo mode, and does not need a key:

- The fit engine. Every accept, accept-part, and redirect decision, and all
  the arithmetic behind them.
- The landing page waybill. That is the real engine running on a sample
  delivery, not a picture of a result.
- The barcode lookup. It calls Open Food Facts for real.
- All six pages, on a phone and on a laptop.

With a key, a judge can upload their **own** photo and have it read.
Without a key they see the canned reading instead.

## 1. Sign in

```bash
cd app
npx vercel login
```

## 2. Set the root directory to `app`

**This is the step that fails.** The Next.js project is in `app/`, not at
the top of the repository. Vercel looks at the top by default, finds no
Next.js app, and the build fails.

Run the link step from inside `app/`:

```bash
cd app
npx vercel link
```

Answer the questions. When it asks for the directory your code is in,
answer `./`, because you are already inside `app`.

If you connect the GitHub repository through the Vercel dashboard instead,
open Project Settings, then Build and Deployment, and set **Root Directory**
to `app`. Save before you deploy.

## 3. Deploy a preview and open it

```bash
npx vercel
```

It prints a URL. Open it. Click through all five pages. The landing page
must show real numbers in the waybill, and the red demo badge in the corner.

## 4. Add the key, if you want live readings

Skip this if demo mode is enough.

Make the key at <https://console.anthropic.com>. Use a **new key in its own
workspace, with a hard spend cap**. Five dollars is plenty. The deployed app
has no login, so anyone with the URL can spend this key, and the spend cap
is the real control. The rate limit in the app is best effort only, because
it counts in memory and each serverless instance counts on its own.

```bash
npx vercel env add ANTHROPIC_API_KEY production
npx vercel env add RESCUEFIT_MODEL production     # claude-sonnet-5-5
```

Sonnet costs about half what Opus does and is accurate enough for reading a
donation. Opus is the code default, so set this variable to switch.

One photo costs about one to two cents to read. Reading a photo sends
roughly 2,000 tokens and gets back about 500. A hundred judge uploads cost
one or two dollars.

## 5. Go to production

```bash
npx vercel --prod
```

The project is named `rescuefit` and the public alias
`rescuefit-pei.vercel.app` is attached to it as a project domain, so it
follows production deployments.

One trap worth naming: `rescuefit.vercel.app` is **somebody else's
project**. It answers 200 and its page title is "RescueFit", so it looks
right at a glance. Check the title is "RescueFit: does this donation fit
your kitchen?" before you paste any vercel.app URL into a document.

## 6. Prove the live path works

Do this once, after you add the key. A deployed app that quietly answers in
demo mode is the failure this step catches.

```bash
RF_BASE=https://your-url.vercel.app npm run smoke:live
```

It calls all four model routes and fails if any of them answers in demo
mode. It also prints the cost of each call, which is the number task Y7
owes Rama for the report.

## If the build fails

- **"No Next.js version detected"** means the root directory is wrong. Go
  back to step 2.
- **A font download error** means the build could not reach Google Fonts.
  Redeploy. It is almost always temporary.
- **The pages load but every number is missing** means
  `public/data/*.json` is absent and the fixture fallback did not run.
  Run `npm run validate:data` locally to see which file is wrong.

## Do not

- Do not put the key in any file inside the repository. `.gitignore` blocks
  `.env*`, and the key belongs in Vercel settings and in `app/.env.local`
  on your own machine only.
- Do not reuse a key you already use somewhere else. If this one leaks you
  want to delete it without breaking anything else.
