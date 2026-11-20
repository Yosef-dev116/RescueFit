---
name: RescueFit
description: A consignment document for donated food, printed on manila kraft and stamped line by line.
colors:
  manila: "#d9cdb0"
  manila-dark: "#c4b595"
  manila-deep: "#a89874"
  stock: "#f6f3ea"
  stock-shade: "#e9e4d6"
  ink: "#1c1a16"
  ink-soft: "#4a463c"
  ink-faint: "#7c7667"
  carbon: "#2f4b6e"
  carbon-soft: "#5b7694"
  stamp: "#b2291f"
  filed: "#2f5d43"
typography:
  display:
    fontFamily: "Archivo Black, Arial Black, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Archivo Black, Arial Black, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Archivo Black, Arial Black, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 0.92
    letterSpacing: "-0.015em"
  lead:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  figure:
    fontFamily: "Courier Prime, Courier New, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.01em"
    fontFeature: "tnum 1"
  label:
    fontFamily: "Courier Prime, Courier New, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.14em"
  stamp:
    fontFamily: "Archivo Black, Arial Black, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0.04em"
rounded:
  none: "0"
  stamp: "2px"
spacing:
  hairline: "1px"
  xs: "0.375rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
  section: "3.5rem"
components:
  nav-link:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.375rem 0.625rem"
  nav-link-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.stock}"
  button-primary:
    backgroundColor: "{colors.stamp}"
    textColor: "{colors.stock}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0.875rem"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.stock}"
  button-primary-disabled:
    backgroundColor: "{colors.stock-shade}"
    textColor: "{colors.ink-faint}"
  button-secondary:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.none}"
    padding: "0.5rem 0.75rem"
  button-secondary-hover:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.ink}"
  input-field:
    backgroundColor: "{colors.stock-shade}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.5rem"
    typography: "{typography.figure}"
  input-field-focus:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.ink}"
  form-box:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "1rem"
  form-box-quiet:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.none}"
    padding: "1rem"
  box-header-band:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.manila}"
    rounded: "{rounded.none}"
    padding: "0.375rem 0.75rem"
    typography: "{typography.label}"
  stamp-accept:
    backgroundColor: "transparent"
    textColor: "{colors.filed}"
    rounded: "{rounded.stamp}"
    padding: "0.18em 0.5em 0.14em"
    typography: "{typography.stamp}"
  stamp-part:
    backgroundColor: "transparent"
    textColor: "{colors.carbon}"
    rounded: "{rounded.stamp}"
    padding: "0.18em 0.5em 0.14em"
    typography: "{typography.stamp}"
  stamp-redirect:
    backgroundColor: "transparent"
    textColor: "{colors.stamp}"
    rounded: "{rounded.stamp}"
    padding: "0.18em 0.5em 0.14em"
    typography: "{typography.stamp}"
  mode-badge-demo:
    backgroundColor: "{colors.stamp}"
    textColor: "{colors.stock}"
    rounded: "{rounded.none}"
    padding: "0.25rem 0.5rem"
  mode-badge-live:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.filed}"
    rounded: "{rounded.none}"
    padding: "0.25rem 0.5rem"
  waybill-line:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.375rem 0.75rem"
  waybill-line-soonest:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.stamp}"
  empty-field:
    backgroundColor: "{colors.stock}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.none}"
    padding: "1.25rem"
---

# Design System: RescueFit

## Overview

**Creative North Star: "The Consignment Document"**

Every page renders as one sheet of a multi-part form. Manila kraft carries the
ground. Readings sit on near-white stock inside bordered boxes, each titled by
a box number in a carbon-ink band. Decisions print as rotated rubber stamps in
the right-hand column of a ruled table. The reader should feel they hold the
receiving copy of a form, not a charity website.

The system is dense and administrative. Figures are typed and line up in
columns. Prose is short and sits between boxes, never in a hero. No dark mode
ships, on purpose: the user stands at a back door in daylight, and paper in
daylight is light.

The North Star name above was derived from the build, not confirmed with the
user. The palette is also provisional in one place: a teammate may supply brand
colours later, and the signal red (`stamp`) and the carbon blue (`carbon`) are
the first tokens to re-map if she does.

**Key Characteristics:**

- Manila kraft ground with two low-contrast dot fields, at 7px and 3px.
- Every reading sits in a ruled box. An empty box still shows its ruling.
- Three faces with fixed roles: stamped caps, prose, typed figures.
- Zero corner radius everywhere except the 2px stamp.
- Decisions read as a word first and a colour second.

## Colors

A kraft-and-carbon palette: one warm ground, one near-white stock, a carbon
black ink with two lighter impressions, and three signal inks.

### Primary

- **Signal Red** (`stamp`): the alarm ink. It inks the REDIRECT stamp, the
  soonest-expiring waybill line (its line number, its day count, its "FIRST TO
  GO" label, and a 7% tint behind the row), refusal and alert blocks, the DEMO
  DATA badge fill, the section numerals, the primary action fill, the diet-flag
  note in the agency table, the "leaving N kg" figure when a gauge runs out,
  and the browser surfaces (focus ring, caret, selection).

### Secondary

- **Carbon Blue** (`carbon`): the second ink of a duplicate copy. It sets every
  typed field label, the ACCEPT PART stamp, the busy status band, the item
  category under each waybill line, and the form `accent-color`.
- **Faded Carbon** (`carbon-soft`): the pending-claim hatch in the storage
  gauge and the nav copy numerals.

### Tertiary

- **Filed Green** (`filed`): a cleared line. It inks the ACCEPT stamp and the
  LIVE MODEL READING badge border and text. Nothing else.

### Neutral

- **Manila Kraft** (`manila`): the page ground, and the type colour inside dark
  header bands.
- **Kraft Shade** (`manila-dark`) and **Kraft Deep** (`manila-deep`): the
  scrollbar track and thumb, so the browser chrome stays in the world.
- **Form Stock** (`stock`): every box interior. Not pure white, so hairline
  rules sit on top of it.
- **Stock Shade** (`stock-shade`): input wells, table head rows, torn-open stub
  backgrounds, and the empty part of a gauge bar.
- **Carbon Ink** (`ink`): body text, every box border, the dark header bands.
- **Soft Ink** (`ink-soft`): explanatory prose under a heading.
- **Faint Ink** (`ink-faint`): hairline row rules, units, hints, hairline seams,
  the used portion of a gauge bar, and the diagonal ruling of an empty box.

### Named Rules

**The Small-Area Red Rule.** The signal red never fills a large area and never
tints the ground. It ships as an outline, a figure, a hairline border, a 7-12%
wash, or a badge-sized fill. On the waybill, exactly one line carries it, even
when two items share the lowest day count.

**The Word-Not-Colour Rule.** Every decision states its word inside the stamp.
The colour repeats the word, it never replaces it, so the surface still reads
in greyscale and for a colour-blind reader.

**The Ground-Carries-Everything Rule.** Manila is the page, not an accent on
white. No surface opts out of it, and there is no dark theme.

## Typography

**Display Font:** Archivo Black (with Arial Black, sans-serif)
**Body Font:** Barlow (with system-ui, sans-serif)
**Label/Mono Font:** Courier Prime (with Courier New, monospace)

All three are self-hosted through `next/font`, so no request goes to a font
host at runtime.

**Character:** A stamped placard, a clerk's prose, and a typewriter. The pairing
is administrative rather than editorial: the heavy face names things, the
monospace carries the numbers, and Barlow stays out of the way between them.

### Hierarchy

- **Display** (Archivo Black 400, 2.25rem, 2.75rem from `sm`, line-height 0.92,
  uppercase, letter-spacing -0.015em): page titles, and the masthead at
  1.75rem / 2.125rem.
- **Headline** (Archivo Black 400, 1.375rem, 1.625rem from `sm`): numbered form
  section titles, beside a typed red index.
- **Title** (Archivo Black 400, 1.0625rem): card titles, day-plan titles, and
  the photo button.
- **Lead** (Barlow 400, 1.25rem, 1.5rem from `sm`, line-height 1.2,
  letter-spacing -0.02em): the one thesis line on the home page.
- **Body** (Barlow 400, 0.9375rem or 0.875rem, line-height 1.55 to relaxed):
  prose under a heading and inside boxes, held to 34-78ch.
- **Figure** (Courier Prime 400, 0.625rem to 1.0625rem, tabular numerals):
  every quantity, kilogram, day count, percent, distance, code path, and date.
  The day count is the largest figure on a waybill line (1.0625rem) because it
  is the number the user forgets.
- **Label** (Courier Prime 400, 0.6875rem, letter-spacing 0.14em, uppercase,
  carbon blue): the name of a box or of the value under it. On a dark header
  band the same label prints in manila.

### Named Rules

**The Typed Figure Rule.** Every figure on this surface is typed. Set it in
Courier Prime with `tabular-nums` and `tnum`, so columns of numbers line up.
A figure in Barlow is a bug.

**The Placard-Names-Things Rule.** Archivo Black names things: the product, the
page, the section, the card, the stamped word. It never sets running prose and
never sets a figure.

## Layout

One centred column. The container is 72rem (`max-w-6xl`) on the home, fit,
plan, impact, and network pages, and 56rem (`max-w-4xl`) on intake. Gutters are
1rem, and 1.5rem from `sm`.

Rhythm is tight and vertical. Numbered form sections are separated by 3.5rem.
Blocks inside a section sit 1.5rem apart, and a label sits 0.25-0.375rem above
the value it names. Box padding is 0.75rem for dense rows, 1rem for prose boxes,
1.25rem for an empty field. Table and list rows are 0.75rem across by
0.375-0.5rem down.

Grids are plain and fixed: three columns for gauges, rule cards and day plans,
two or four for totals strips, two for the intake control. The waybill uses a
seven-column grid from `md` (`1.75rem minmax(0,2.4fr) 4.5rem 4.5rem 4.5rem 5rem
7.5rem`) and collapses to three columns below it, moving qty, kg and storage
into a typed sub-line under the item name.

The home surface is measured: masthead, consignment head, thesis line, live
waybill, totals strip, intake control, and the perforated tear line land at
897px of 900 at 1440x900. That measurement belongs to the home surface. It is
not a budget other pages have to meet.

### Named Rules

**The Hairline Seam Rule.** Adjacent cells in a strip are separated by a 1px
seam, made with `gap-px` over a faint-ink background, never by a margin. The
strip reads as one printed block divided by rules.

**The Tear-Line Rule.** A perforated 1px dashed line closes a stretch of the
form. Use it where the document would physically tear, not as a decorative
divider between every block.

## Elevation & Depth

The system is almost flat. Depth is paper resting on paper, not a UI lifting
off a canvas. One shadow ships, on the ruled box: a small blurred offset
(`1px 2px 4px -1px rgba(28,26,22,0.2)`) that reads as a sheet sitting slightly
down and to the right of the ground. Everything else gets its depth from
borders, from the dark header band, and from the dot-field ground behind the
white stock.

### Shadow Vocabulary

- **Sheet** (`box-shadow: 1px 2px 4px -1px rgba(28,26,22,0.2)`): every ruled
  box, at rest.
- **Sheet lifted** (`box-shadow: 2px 4px 8px -2px rgba(28,26,22,0.28)` with
  `translateY(-1px)`): the hover state of the three link cards at the foot of
  the home page. This is the only hover lift in the build.

### Named Rules

**The Paper-On-Paper Rule.** The offset stays, because the sheet sits off the
ground, but the blur is what makes it a shadow. A zero-blur hard offset block
is a poster device, and this world is a document.

## Shapes

Corners are square. Radius is 0 on every box, button, input, badge, band and
table. The one exception is the rubber stamp at 2px, which reads as a trimmed
rubber die rather than a rounded button.

Borders carry the form: 1px carbon ink around a ruled box, 1px faint ink for
row rules and for the quiet box, 2px ink under the masthead and above the
footer, 2px dashed faint ink around the photo drop target, 2.5px of the current
ink around a stamp, and 1px dashed for a torn-open stub.

Recurring fills instead of shapes: diagonal ruling at -45 degrees for an empty
field and for a pending gauge claim, and a repeating dash for the perforation.

Icons are drawn, not typographic. Three marks ship (caret, arrow, dot) at 7-13px,
sharing `stroke-width: 1.75` with round caps and joins, and all are decorative
and hidden from screen readers.

## Components

### Buttons

- **Shape:** square (0 radius), with a visible border.
- **Primary:** signal red fill, form-stock text, 2px ink border, stamped caps at
  0.8125rem, padding 0.5rem 0.875rem. One per surface. On the fit page the same
  button ships as a link at 0.9375rem with padding 1rem 0.625rem.
- **Hover / Active:** fill goes to carbon ink; active presses down 1px.
- **Disabled:** stock-shade fill, faint-ink border and text.
- **Secondary:** form stock, 1px faint-ink border, typed caps at 0.6875rem in
  carbon blue. Hover darkens the border and the text to ink.
- **Nav link:** form stock, 1px ink border, a typed copy number in faded carbon
  beside a Barlow label. Hover and focus invert to ink fill with stock text.

### Cards / Containers

- **Corner Style:** square (0 radius).
- **Background:** form stock on the manila ground.
- **Border:** 1px carbon ink. The quiet variant uses 1px faint ink and drops
  the shadow.
- **Shadow Strategy:** the Sheet shadow, see Elevation & Depth.
- **Internal Padding:** 0.75rem for dense boxes, 1rem for prose boxes.
- **Header band:** a dense box is titled with a full-width carbon-ink band
  carrying typed manila caps at 0.6875rem and 0.14em tracking, with the box
  number first ("Box 5 · ..."). This band appears on the waybill, the intake
  control, the agency table and the plan lists.

### Inputs / Fields

- **Style:** stock-shade well, 1px ink border, square, typed at 0.8125rem.
  Placeholders are faint ink.
- **Focus:** the well brightens to form stock. The global focus ring is a 2px
  signal-red outline at 2px offset, which is the only focus treatment.
- **Disabled:** 55% opacity.
- **Photo drop target:** a 2px dashed faint-ink rectangle on stock-shade, with
  a stamped-caps call to action. Hover turns the dash signal red.
- **Label:** every field is named by a typed carbon-blue label above it.

### Navigation

Numbered boxes on a filing strip in the masthead, one per section, each with a
two-digit copy number. Links stay underlined elsewhere in prose with a 0.22em
offset. Masthead and card titles turn signal red on hover.

### Waybill (signature component)

The ruled table of consignment lines, and the centre of the document.

- A dark header band prints the column names in typed manila caps.
- Each line is a button. Rows are separated by 1px faint-ink rules.
- The decision is a stamp in the right column, with a caret that rotates 90
  degrees when the line is open.
- The soonest-expiring line is washed with 7% signal red, and its line number,
  day count and "FIRST TO GO" label print in signal red.
- The line tears open in place, below itself, on a stock-shade stub with a
  dashed top rule. It holds the reason, the kept and redirected kilograms, the
  read confidence, and the routed-to agency. Opening a line never navigates
  away, and only one line is open at a time.

### Stamp (signature component)

A rubber stamp impression: stamped caps at 0.6875rem, 2.5px border in the
current ink, 2px radius, `mix-blend-mode: multiply`, 0.88 opacity, rotated
-2.2 degrees because a hand never lands a stamp square. Tones are filed green
for Accept, carbon blue for Accept part, signal red for Redirect, soft ink for
neutral. On the home page it animates once, a 440ms press that lands from above
and over-presses, and it is disabled under `prefers-reduced-motion: reduce`.

**The One Worn Stamp Rule.** Wear belongs to the event, never to the page.
Exactly one stamp on a surface may wear, and it is the line with the lowest day
count. The wear is a coarse fractal-noise mask plus a 0.5px ink spread, with the
alpha row of the colour matrix at `-0.32 1.06`, so the thinnest part of the mark
still prints at about three quarters strength. Past about -0.6 the stamp stops
being legible, which trades the decision for a texture. Legibility wins.

### Storage gauge

A ruled box that shows free kilograms in one storage type. A 1.25rem
bar with a 1px ink border shows used space in faint ink and this donation's
pending claim as a carbon-blue diagonal hatch. The headline figure is free
space today. The remainder figure turns signal red only when the delivery would
leave nothing.

### Empty field

A ruled box with -45 degree diagonal ruling, holding a 95%-opacity stock panel
with a typed label and an optional hint. It ships on the impact page, the plan
page, and the network map loader.

### Mode badge

The honesty marker, placed where the reader is already looking. Demo is a
signal-red fill with stock text. Live is a form-stock fill with a filed-green
border and text. Both carry a filled dot and typed caps at 0.6875rem.

## Do's and Don'ts

### Do:

- **Do** put every reading in a ruled box, and show the diagonal ruling when the
  box is empty.
- **Do** set every figure in Courier Prime with tabular numerals.
- **Do** title a dense box with the carbon-ink header band and its box number.
- **Do** keep corners square (0 radius), with the single 2px stamp exception.
- **Do** separate cells in a strip with a 1px hairline seam.
- **Do** say the decision in a word inside the stamp, and let colour repeat it.
- **Do** keep prose measures between 34ch and 78ch.
- **Do** name a field with a typed carbon-blue label directly above it.

### Don't:

- **Don't** use a zero-blur hard offset shadow. The one shadow in this system is
  blurred, because this is a document and not a poster.
- **Don't** flood an area with the signal red. It ships as an outline, a figure,
  a hairline, a 7-12% wash, or a badge-sized fill.
- **Don't** paint two waybill lines red, and don't wear two stamps on one
  surface. Both halve the only signal the document has.
- **Don't** add corner radius above 2px, and don't add a shadow value beyond the two in the vocabulary.
- **Don't** set prose in Archivo Black, or a figure in Barlow.
- **Don't** put a typed label above a page title where it names nothing. A field
  label names a box or the value under it. Above an `h1` it is a kicker, and the
  build already carries five of those ("Section 01" through "Section 05").
- **Don't** use a glyph or an icon-font character as an icon. Icons are drawn
  SVG at `stroke-width: 1.75` with round caps.
- **Don't** use numeric font-weight utilities (`font-400`, `font-600`,
  `font-700`). Tailwind v4.3.3 compiles them to nothing, so the weight is
  silently dropped and the text renders at 400. The build carried sixteen of
  them until they were found and replaced with `font-normal`,
  `font-semibold` and `font-bold`. Check a weight in the built CSS before you
  trust it: `grep -o '\.font-semibold{[^}]*}' .next/static/chunks/*.css`.
- **Don't** add a dark theme. The user reads this in daylight, and paper in
  daylight is light.
