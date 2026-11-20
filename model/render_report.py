"""Generate the three review PDFs and their charts from the reference results."""
import json
from pathlib import Path
from xml.sax.saxutils import escape, quoteattr

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
DATA = ROOT / "model/data"
WIDTH = 508
INK = "#18342a"
MUTED = "#496358"
GREEN = "#236948"
LIME = "#e5efd0"
PAPER = "#f2f6ee"
LINE = "#d4dfd2"
POLICIES = ["baseline", "fit_only", "rescuefit"]
LABELS = ["Storage only", "Kitchen fit", "Fit + redirect"]
OUTCOMES = [
    ("Used in prep", "kg_used", GREEN), ("Expired at kitchens", "kg_wasted_at_agency", "#b66b49"),
    ("Ending inventory", "kg_remaining", "#93b996"), ("Unallocated", "kg_unallocated", "#d8c4a6"),
]
SOURCES = [
    ("Holland College, IMPAC 2026 Assignment", "https://hollandcollege.com/about/applied-research/impac/impac_assignment.docx",
     "Competition rules, criteria and submission requirements."),
    ("PEI Food Recovery Network Final Report",
     "https://cdnsm5-hosted.civiclive.com/UserFiles/Servers/Server_10500298/File/Environment%20and%20Sustainability/Food/ES%2023-08%20Attachment%20-%20PEI%20Food%20Recovery%20Network%20Final.pdf",
     "Table 1, page 1, and Chart 1, page 3. Workbook row 90."),
    ("PEI engagement feedback on food waste reduction",
     "https://www.princeedwardisland.ca/en/information/agriculture/a-summary-of-engagement-feedback-on-food-waste-reduction",
     "Local consultation reports and methodological limitations."),
    ("Second Harvest Food Rescue App", "https://www.secondharvest.ca/programs/app",
     "Existing donation posting, claiming and pickup."),
    ("Buisman et al. (2019), Donation management for menu planning at soup kitchens",
     "https://doi.org/10.1016/j.ejor.2018.06.005", "Published joint menu and donation optimization method."),
    ("Feeding America meal-equivalent convention", "https://www.feedingamerica.org/ways-to-give/faq/about-our-claims",
     "Mass conversion of 1.2 lb per equivalent."),
    ("ECCC GHG Calculator for Organic Waste Management",
     "https://www.canada.ca/en/environment-climate-change/services/managing-reducing-waste/municipal-solid/waste-greenhouse-gases-canada-actions/calculator.html",
     "Pathway-dependent scenarios. Workbook row 68."),
    ("IWMC commercial program", "https://iwmc.pe.ca/commercial/", "PEI compost sorting context. See also workbook row 83."),
    ("Prince Edward Island Donation of Food Act", "https://www.princeedwardisland.ca/en/legislation/donation-food-act",
     "Local statute to review with the operator."),
]


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def fonts():
    path = Path("/usr/share/fonts/truetype/dejavu")
    if (path / "DejaVuSans.ttf").exists():
        pdfmetrics.registerFont(TTFont("RescueSans", str(path / "DejaVuSans.ttf")))
        pdfmetrics.registerFont(TTFont("RescueBold", str(path / "DejaVuSans-Bold.ttf")))
        pdfmetrics.registerFontFamily("RescueSans", normal="RescueSans", bold="RescueBold")
        return "RescueSans", "RescueBold"
    return "Helvetica", "Helvetica-Bold"


REGULAR, BOLD = fonts()
STYLES = {
    "tag": ParagraphStyle("tag", fontName=BOLD, fontSize=9, leading=13, textColor=colors.HexColor(GREEN), spaceAfter=9),
    "title": ParagraphStyle("title", fontName=BOLD, fontSize=29, leading=34, textColor=colors.HexColor(INK), spaceAfter=11),
    "deck": ParagraphStyle("deck", fontName=REGULAR, fontSize=12, leading=18, textColor=colors.HexColor(MUTED), spaceAfter=18),
    "h": ParagraphStyle("h", fontName=BOLD, fontSize=14, leading=18, textColor=colors.HexColor(INK),
                        spaceBefore=11, spaceAfter=6, keepWithNext=True),
    "p": ParagraphStyle("p", fontName=REGULAR, fontSize=10.2, leading=15.1, textColor=colors.HexColor(INK), spaceAfter=10),
    "small": ParagraphStyle("small", fontName=REGULAR, fontSize=8.8, leading=13, textColor=colors.HexColor(MUTED), spaceAfter=9),
    "cell": ParagraphStyle("cell", fontName=REGULAR, fontSize=9.1, leading=13, textColor=colors.HexColor(INK)),
    "header": ParagraphStyle("header", fontName=BOLD, fontSize=8.8, leading=12, textColor=colors.white, alignment=TA_LEFT),
    "metric": ParagraphStyle("metric", fontName=BOLD, fontSize=18, leading=21, textColor=colors.HexColor(INK), spaceAfter=4),
}


def p(content, style="p"):
    return Paragraph(escape(content), STYLES[style])


def section(tag, title, deck=""):
    return [p(tag.upper(), "tag"), p(title, "title")] + ([p(deck, "deck")] if deck else [])


def rows(headers, values, widths):
    grid = [[p(cell, "header") for cell in headers]]
    grid += [[p(str(value), "cell") for value in row] for row in values]
    table = Table(grid, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(INK)),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor(PAPER), colors.white]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 1), (-1, -1), .55, colors.HexColor(LINE)),
    ]))
    return table


def stat_band(metrics):
    band = Table([[[p(value, "metric"), p(label, "cell")] for value, label in metrics]],
                 colWidths=[WIDTH / len(metrics)] * len(metrics), hAlign="LEFT")
    band.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(LIME)),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 11), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
        ("BOX", (0, 0), (-1, -1), .6, colors.HexColor(LINE)),
    ]))
    return band


def kg(value, digits=0):
    return f"{value:,.{digits}f} kg"


def signed(value, digits=0):
    return f"{value:+,.{digits}f}".replace("-", "−")


def graph_style(ax):
    ax.set_axisbelow(True)
    ax.spines[["top", "right", "left"]].set_visible(False)
    ax.spines["bottom"].set_color(LINE)
    ax.tick_params(colors=MUTED, labelsize=9, length=0)
    ax.set_facecolor("white")


def charts(ref):
    fig, ax = plt.subplots(figsize=(8.1, 2.3), layout="constrained")
    left = [0] * len(POLICIES)
    for label, key, color in OUTCOMES:
        vals = [ref[policy][key] for policy in POLICIES]
        ax.barh(LABELS, vals, left=left, label=label, color=color, height=.58)
        left = [a + b for a, b in zip(left, vals)]
    ax.invert_yaxis()
    ax.set_xlabel("Mean kg per modeled period", color=MUTED, fontsize=9)
    ax.legend(ncol=4, bbox_to_anchor=(0, 1.04), loc="lower left", frameon=False, fontsize=8.5)
    ax.grid(axis="x", color=LINE, linewidth=.6)
    graph_style(ax)
    fig.savefig(DOCS / "scenario_mass.png", dpi=210, facecolor="white")
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(8.1, 2.8), layout="constrained")
    for key, label, color in zip(POLICIES, LABELS, ["#a65230", "#366b94", GREEN]):
        ax.plot([r["day"] for r in ref["daily"]], [r[f"{key}_waste_kg"] for r in ref["daily"]],
                label=label, linewidth=2, color=color)
    ax.set_xlabel("Simulated day", color=MUTED, fontsize=9)
    ax.set_ylabel("Mean expired kg", color=MUTED, fontsize=9)
    ax.legend(loc="upper left", frameon=False, ncol=3, fontsize=8.5)
    ax.grid(axis="y", color=LINE, linewidth=.6)
    graph_style(ax)
    fig.savefig(DOCS / "scenario_daily.png", dpi=210, facecolor="white")
    plt.close(fig)


def figure(name, height):
    return Image(str(DOCS / name), width=WIDTH, height=height, kind="proportional")


def source_text(i):
    label, url, comment = SOURCES[i - 1]
    return Paragraph(f'<b>[{i}] <a href={quoteattr(url)} color="{GREEN}">{escape(label)}</a></b><br/>{escape(comment)}',
                     STYLES["p"])


def render(filename, label, pages):
    def edges(canvas, doc):
        canvas.setFillColor(colors.HexColor(GREEN))
        canvas.roundRect(52, 752, 14, 10, 2, stroke=0, fill=1)
        canvas.setFillColor(colors.HexColor(INK))
        canvas.setFont(BOLD, 9)
        canvas.drawString(74, 753, "RESCUEFIT PEI")
        canvas.setFont(REGULAR, 8)
        canvas.drawRightString(560, 753, label)
        canvas.setStrokeColor(colors.HexColor(LINE))
        canvas.line(52, 744, 560, 744)
        canvas.line(52, 46, 560, 46)
        canvas.setFillColor(colors.HexColor(MUTED))
        canvas.drawString(52, 28, "IMPAC 2026  /  Innovation Stream  /  Team review")
        canvas.drawRightString(560, 28, f"{doc.page:02d}")

    story = []
    for i, page in enumerate(pages):
        if i:
            story.append(PageBreak())
        story.extend(page)
    SimpleDocTemplate(str(DOCS / filename), pagesize=letter, leftMargin=46, rightMargin=46,
                      topMargin=62, bottomMargin=57, title=f"RescueFit PEI | {label}",
                      author="Team RescueFit").build(story, onFirstPage=edges, onLaterPages=edges)


def comparison(ref):
    return rows(["Outcome", *LABELS],
                [(label, *(kg(ref[key][metric]) for key in POLICIES)) for label, metric, _ in OUTCOMES],
                [166, 114, 114, 114])


def scenario_range(result):
    return signed(result["p05"], 1) + " to " + signed(result["p95"], 1) + " kg"


def main():
    ref = load(DATA / "scenario_results.json")
    checks = load(DOCS / "sensitivity_results.json")
    evidence = load(DATA / "pei_evidence.json")
    base, fit = ref["baseline"], ref["rescuefit"]
    inc = ref["uncertainty"]["paired_delta"]["kg_used_increase"]
    expiry = base["kg_wasted_at_agency"] - fit["kg_wasted_at_agency"]
    extra = fit["kg_unallocated"] - base["kg_unallocated"]
    sensitivity = [(case["label"], signed(case["paired_delta"]["kg_used_increase"]["mean"], 1) + " kg",
                    scenario_range(case["paired_delta"]["kg_used_increase"]))
                   for case in checks["scenarios"]]
    no_alternate = next(x for x in checks["scenarios"] if x["settings"]["confirmation"] == 0)
    no_alt = no_alternate["paired_delta"]["kg_used_increase"]["mean"]
    window = f"{ref['days']} days, {ref['donors']} donors, {ref['agencies']} receiving sites, {ref['seeds']} paired runs"
    charts(ref)

    project = [
        section("Executive summary", "RescueFit PEI", "A receiving kitchen can match food donations to planned meals, adjust its shopping list and track the unplaced portion of a collected lot.") + [
            p("The decision", "h"),
            p("PEI's food-waste consultation records community organizations discarding food intended for redistribution. The prototype addresses what happens when a kitchen receives an offer or a collected lot and must work out how much it can use amid planned services, limited storage and preparation capacity. [3]"),
            p("The product", "h"),
            p("A volunteer reviews weights and use windows in one browser workspace. RescueFit allocates food to scheduled meals, shows adjustable purchases, and lists feasible modeled destinations for collected surplus. A lot ledger records recipient confirmation, physical handoff and preparation use as separate events."),
            stat_band([(signed(inc["mean"]) + " kg", "More used in the reference"),
                       (kg(expiry), "Less expired at kitchens"),
                       (signed(extra) + " kg", "More unallocated")]),
            Spacer(1, 12),
            p(f"Reference: {window}, using a historical PEI category profile and synthetic operational inputs. The central 90% of paired differences in food used spans {scenario_range(inc)}. The no-alternate case averages {signed(no_alt, 1)} kg. More unallocated food remains unresolved in the reference. A pilot must track where it goes."),
            p("What we would test next", "h"),
            p("Reconstruct a recent donation decision with one receiving kitchen. Compare a feasible alternative, inventory and purchase changes, staff minutes, handoff outcomes and final food use. Use that evidence to decide whether a four-week shadow pilot is worthwhile."),
        ],
        section("Project report / 1", "The receiving decision", "The opportunity begins when the operator decides whether a particular donation fits the meals and resources already planned.") + [
            p("The local problem", "h"),
            p("Some community organizations responding to PEI's consultation reported discarding food meant for redistribution. Reported reasons included spoilage and donations clients did not want or need. The consultation had limited supply-chain and nonprofit participation, so it establishes a risk to investigate rather than a provincial waste rate. [3]"),
            p("Existing workflow", "h"),
            p("Second Harvest operates an app for posting, claiming and picking up donations. Its historical PEI project recorded 81 new donor and 22 new nonprofit signups. Those figures show earlier participation and give a scale for our modeled network. The prototype can be tested beside the current service without integrating with it. [2, 4]"),
            p("What this project contributes", "h"),
            p("Published research has already combined donation acceptance and menu planning. In this prototype, an operator can see the quantity selected for each meal, the uncommitted purchase it can replace and the handoff status for the same lot. The possible innovation is making that workflow repeatable in a small kitchen with lightweight inputs. Verify the improvement against the operator's usual process. [5]"),
            p("First operator", "h"),
            p("Start with a community or institutional kitchen that prepares scheduled meals, receives ingredients regularly and can decide what to accept. A kitchen that only distributes sealed parcels would need a different set of planning constraints."),
        ],
        section("Project report / 2", "Product and demonstration", "One reviewed decision uses a stable lot identifier from intake through recorded use and discard.") + [
            rows(["Step", "Decision, calculation or action"], [
                ("Intake", "Parse written weights and counted units, then review the ingredient, storage and use window. Attach a photo or read printed text where the browser supports it."),
                ("Kitchen fit", "Reserve current stock for planned meals first. Fit reviewed lots by food, dates, storage and preparation. Respect donor-permitted splits."),
                ("Redirect map", "For collected surplus, rank fictional recipients by distance after fit checks. Track confirmation and physical transfer separately."),
                ("Meal and purchasing plan", "Assign ingredients to up to three days of planned meals. Reduce only purchases that can still be changed. Save the plan and record outcomes."),
                ("Impact lab", "Rerun the seeded policy model, inspect the daily series and export settings and results."),
            ], [134, 374]),
            p("Walk through the carrot lot", "h"),
            p("The fictional kitchen has 12 kg of collected carrots. Soup needs 8 kg, 2 kg are on hand and 6 kg are still on the shopping list. The tool keeps 6 kg and suggests a modeled destination for 6 kg. A confirmed recipient does not change custody. Recording the handoff moves 6 kg out of the pending segment. There is still zero recorded use until the operator logs preparation."),
            p("With example inputs of CAD 2.50/kg and CAD 2 added handling, 6 kg of planned purchase replacement would be CAD 13 of indicative net benefit. Purchases and actual use need separate confirmation.", "small"),
        ],
        section("Project report / 3", "Data and comparison method", "The workbook provides a research catalogue. The simulation identifies which published inputs it reuses.") + [
            rows(["Data", "Use and boundary"], [
                ("Row 90, PEI report", "81 donors and 22 nonprofits set network size. Six published food groups totalling 98 percentage points set the synthetic offer profile after normalization."),
                ("Rows 39, 43, 68", "Shelf-life documentation and retail and treatment data are references. Confirmed inputs drive each lot. PEI-wide cost and emissions are left unestimated."),
                ("Rows 4, 8", "Kitchen and canteen waste data do not measure eligible incoming offers. They were excluded from forecast training."),
                ("Synthetic fixtures", "Daily offer activity, weight, destination, capacity, category breakdown, time available for use and confirmation. Town positions are approximate."),
            ], [152, 356]),
            p("Paired design", "h"),
            p(f"Each policy sees the same offers and site-day use variation for that seed. Reference settings use {window}. Storage only checks capacity at the initial site. Kitchen fit also checks planned use before the lot deadline. Fit plus redirect adds a hypothetical transfer where a nearer alternate can take weight."),
            p("The reference permits an alternate attempt for 55% of offer-specific draws, with a 35 km straight-line radius and one modeled receiving alternate. Daily use can vary by 30% from plan. The simulation also retains a separate accept-all stress case."),
            p("Accounting identity", "h"),
            p("Offered kg = used kg + expired kg at receiving sites + unallocated kg + ending inventory. Transit is an intermediate event. Every run checks the identity."),
        ],
        section("Project report / 4", "Results and trade-offs", f"Mean per modeled period. Each reference policy saw {kg(base['kg_offered'])} of offers.") + [
            comparison(ref), Spacer(1, 11), figure("scenario_mass.png", 145),
            p(f"The reference added {kg(inc['mean'], 1)} of modeled use and reduced receiving-site expiry by {kg(expiry, 1)}. It also left {kg(extra, 1)} more unallocated and {kg(fit['kg_remaining']-base['kg_remaining'], 1)} more in stock at the end. Later use or waste of those quantities is unknown."),
            p(f"Without a confirmed alternate, kitchen fit averaged {signed(no_alt, 1)} kg in use compared with storage only. The main additional use therefore depends on actual handoff capability in this model. The result should guide what to measure in a pilot."),
            p(f"Paired 5th–95th percentile for increased use: {scenario_range(inc)}. This range describes differences across modeled runs. See the scenario companion for settings and sensitivity.", "small"),
        ],
        section("Project report / 5", "Feasibility and validation", "Start with a measured decision comparison at one kitchen before introducing shared live routing.") + [
            rows(["Pilot stage", "Evidence to collect"], [
                ("Reconstruct a case", "Record the operator's original decision first. Use the same weights, available storage, approved windows, kitchen capacity and purchase cutoff in both comparisons."),
                ("Run in parallel", "Review recommendations alongside the usual process. Log changes, reasons, time taken and actual fulfilment."),
                ("Compare outcomes", "Record prepared and served amounts when feasible, expiry, quantities that could still be used, unallocated weight and confirmed handoffs. Reconcile by lot."),
                ("Choose whether to continue", "Compare avoidable purchase spending less added direct costs. Consider staff time and potential effects on meal availability or acceptance."),
            ], [153, 355]),
            p("Practical deployment", "h"),
            p("The current prototype is a static, offline-capable page with local persistence and exports. App code and Python scenario calculations are included. A shared pilot would need a partner, agreed handling steps, authenticated storage and confirmations by actual recipients."),
            p("Current evidence", "h"),
            p("Automated checks cover the carrot decision, counted-unit intake, donor split permissions, event accounting, browser/Python numerical agreement and initialized screen flow. Partner use, time saved, actual losses and usability on kitchen devices remain to be measured."),
        ],
        section("Project report / 6", "Growth and limits", "Expand only where the receiving process, staff effort and handoff reliability support it.") + [
            p("Support and funding", "h"),
            p("Test an institution- or network-sponsored pilot. Early cost drivers are onboarding, recipe maintenance, secure shared records and coordination. Ask the sponsor who would own these costs and how evidence of useful changes would justify continuing."),
            p("Conditions for expansion", "h"),
            p("After one site, work with a small group of willing recipients who can confirm the food and share current capacity. Review failed referrals and added transport effort. An integration or reporting service is a later business hypothesis."),
            rows(["Known limitation", "What to test or collect"], [
                ("Modeled flow", "Dated eligible offers, actual capacities, fulfilled transfers and what was used or discarded."),
                ("Food information", "Staff review of the actual product, dates and handling history, with the approved local process."),
                ("No operational forecast", "A complete dated series of eligible offered weights, including known zero days."),
                ("No default emissions or dollars saved", "Verified differences in purchasing and local treatment, plus transport and handling costs."),
                ("Early tool evaluation", "A comparison with a knowledgeable operator, followed by a supervised trial."),
            ], [164, 344]),
        ],
        section("Project report / references", "Sources and reproducibility", "The supplied IMPAC workbook was inspected. The bundled audit maps selected rows to their roles.") + [
            *[source_text(i) for i in range(1, len(SOURCES) + 1)],
            p("Reproduce with model/simulate.py and model/sensitivity.py. Build the local page with model/build_demo.py. The included technical guide identifies the reference inputs and test entry points.", "small"),
        ],
    ]

    guide = [
        section("Prototype guide / 1", "Follow one donation", "Unzip the package and open demo/index.html. The sample is a fictional kitchen and carrot lot.") + [
            rows(["Open", "What to do"], [
                ("Intake", "Review the 12 kg already collected. Try text intake only after finishing the preset if you want to rehearse the same story."),
                ("Kitchen fit", "Check the 6 kg allocation. Try a change to free fridge space or the soup service's portions. Restore the original setting for the guide example."),
                ("Redirect map", "Inspect the candidate and distance. Mark the site unavailable to see an alternative. Restore availability."),
                ("Use-first plan", "Review the soup assignment and shopping reduction. Choose Save demo plan."),
                ("Redirect map", "Simulate recipient confirmation, then record the simulated handoff. The lot ledger reconciles all 12 kg."),
                ("Use-first plan", "Enter 4 kg and record prep use. The transfer is still 6 kg, prep use is 4 kg and kitchen stock is 2 kg."),
            ], [135, 373]),
            p("Before-pickup example", "h"),
            p("Use a draft lot with Offer before pickup and record that the donor permits splitting. After staff review, the tool recommends the amount the kitchen can actually use. An amount left with the donor stays outside the receiving balance."),
            p("Reset example returns to the reviewed sample. Export the decision and ledger from the Use-first plan before resetting if you want the outcome record.", "small"),
        ],
        section("Prototype guide / 2", "Run and share the model", "Impact lab runs the same rules as the offline reference model.") + [
            rows(["Action", "Result"], [
                ("Run simulation", "Recompute across all paired seeds. Adjust confirmation, volumes, throughput, variability, radius, days, run count or category mix."),
                ("No alternates", "Set the availability assumption to zero and rerun. Fit plus redirect becomes kitchen fit."),
                ("Replay seed", "Advance the first seed by day. The policy series and current-day values update together."),
                ("Download JSON or daily CSV", "Export the displayed run with its seed and settings."),
                ("Data sources", "Read the workbook row mapping and historical PEI input profile."),
            ], [157, 351]),
            p("Hosting", "h"),
            p("The single HTML can be served as a static web page. The app/public/rescuefit/index.html copy can also be served under the team's Next project. The package includes network and impact route adapters. The team should check the copy in its deployed app before publishing a URL."),
            p("Records and support", "h"),
            p("Data stay in the current browser's local storage. Photo attachments stay in the current tab. Final submission materials should be reviewed by the participating team. See docs/INTEGRATION.md for the full handoff."),
        ],
    ]
    model = [
        section("Scenario model / 1", "Paired results", window.capitalize()) + [
            stat_band([(signed(inc["mean"], 1) + " kg", "Added modeled food use"),
                       (kg(expiry, 1), "Less expired at kitchens"),
                       (signed(extra, 1) + " kg", "More unallocated")]),
            Spacer(1, 14),
            comparison(ref), Spacer(1, 13), figure("scenario_mass.png", 165),
            p(f"The central 90% across the paired outcomes for food used is {scenario_range(inc)}. The used, expired, inventory and unallocated columns sum to offered weight, apart from rounding. Transfers are already included in one of those outcomes."),
        ],
        section("Scenario model / 2", "Time, capacity and movement", "All three reference policies see identical synthetic offers and service variation in each seed.") + [
            figure("scenario_daily.png", 193),
            p("What changes across policies", "h"),
            p("The baseline accepts up to free capacity at the original kitchen. Kitchen fit additionally checks use capacity by each lot deadline. Fit plus redirect tries one alternate if the offer draw is below the selected confirmation assumption. All policies serve the earliest deadline first."),
            p("Alternate logistics", "h"),
            p(f"The reference modeled a mean of {fit['transfers']:.1f} handoffs for {kg(fit['kg_redirected'], 1)} within the period. Straight-line exposure was {fit['redirect_kg_km']:,.0f} kg·km. Travel routes, cooling, staff and vehicle costs require field inputs."),
            p(f"Report context: {evidence['new_donors']} historical donor signups and {evidence['new_nonprofits']} nonprofit signups. Six represented Chart 1 weight groups total 98 percentage points. Recipient capacities and the offer process are designed inputs. [2]", "small"),
        ],
        section("Scenario model / 3", "Sensitivity and audit", "Mean paired difference in food used versus storage only.") + [
            rows(["Setting", "Mean change", "Central 90% across runs"], sensitivity, [218, 108, 182]),
            p("Interpretation", "h"),
            p("The ability to confirm and complete transfers matters. With no alternate available, checking fit can keep more food from expiring inside kitchens while it leaves more food unallocated. Track the full mass balance before using the model to support a waste reduction claim."),
            p("Reproduction", "h"),
            p(f"The reference starts at seed {ref['seed_start']} for {ref['seeds']} trials. Run model/simulate.py with the bundled data, then model/sensitivity.py. The generated JSON retains per-policy means, intervals and daily series. The browser engine reproduces the same reference."),
            p("Meal equivalents use a 1.2 lb reporting convention [6]. CO2e needs a documented treatment comparison and transport inputs. Substitution value in the example uses fixture prices and a handling assumption.", "small"),
        ],
    ]
    render("Innovation_RescueFit_1_Project.pdf", "Project report draft", project)
    render("Innovation_RescueFit_2_PrototypeGuide.pdf", "Prototype guide", guide)
    render("Innovation_RescueFit_3_ScenarioModel.pdf", "Scenario model", model)


if __name__ == "__main__":
    main()
