# Rama: Report, Business Model, Validation, Pitch

Branch: `rama`. Folder you own: `docs/`.

**You own the only required file**, `Innovation_RescueFit_1_Project`. If the prototype breaks, your report still wins or loses the competition. Start the report tonight.

Read `TEAM_PLAN.md` sections 1, 2, 3, and 9 first. Read the assignment brief: https://hollandcollege.com/about/applied-research/impac/impac_assignment.docx

## Setup (10 min)

1. Accept the GitHub invite to `Yosef-dev116/RescueFit`.
2. Clone the repo and check out your branch:
   ```bash
   git clone https://github.com/Yosef-dev116/RescueFit.git
   cd RescueFit && git checkout rama
   ```
3. Make one shared Google Doc called `Innovation_RescueFit_1_Project`. Give Yosef and Fahd edit access. Put its link in `docs/README.md`.

## Block 1: Thu 7:45-11:30 pm

### R1. Report skeleton (by 9:00 pm)
Put these headings in the Google Doc. They follow the brief.

1. **Executive Summary** (max 1.5 pages): problem, solution, key findings, expected benefits.
2. **Problem Definition**: food rescue in PEI. The waste happens at the receiving kitchen. Who suffers?
3. **Methodology**: how we designed, built, and tested the solution.
4. **Data Sources**: table of datasets with licence (copy from `TEAM_PLAN.md` section 10).
5. **Analysis and Findings**: Fahd's simulation, forecast, and accuracy numbers.
6. **Solution Design**: user flow, screenshots, architecture diagram, why it is new.
7. **Expected Impact**: kg, meals, CO2e, CAD, and social benefit.
8. **Feasibility and Adoption**: cost, pilot plan, validation quote.
9. **Business Model and Growth**.
10. **Limitations and Assumptions**.
11. **Future Opportunities**.
12. **References**.

### R2. Problem section and sources (first draft tonight)
1. Get the facts from: the Second Harvest PEI Food Recovery Network report, HungerCount PEI 2025, PROOF food insecurity data, and the Second Harvest research library.
2. Find numbers on **waste at the receiving end**: food banks that throw out donated food. This is our key claim. Find at least 2 sources.
3. Write each source in `docs/sources.md`: claim, number, URL.

### R3. Validation outreach (extra X6, start tonight)
A real quote is the strongest proof the judges can get.
1. Email 3-4 people tonight: the Upper Room Hospitality Ministry, Second Harvest (the Atlantic or PEI contact), a campus food bank (UPEI or Holland College), and the Culinary Institute of Canada.
2. Ask 3 short questions:
   - How often do you get donations you cannot store or use in time?
   - What do you do with them?
   - Would a phone tool that checks fit before you accept food help you?
3. Ask if we can quote them by name in a student competition report.
4. Even one reply by Friday noon is a big win. Put replies in `docs/validation.md`.

**Checkpoint 1 (11:30 pm):** Skeleton done, problem draft done, emails sent. Commit `docs/` and open a PR.

## Block 2: Fri 8:00 am-2:00 pm

### R4. Business model (extra X7)
Write `docs/business_model.md`, then move it into the report.
1. **Customers:** receiving agencies (free), donors (paid), and funders.
2. **Revenue:** donor subscription for tax-receipt records and waste or ESG reports. Grants (PEI climate funds, Second Harvest, Food Banks Canada). A white-label licence for food-rescue networks.
3. **Costs:** AI API cost per photo (ask Yosef for the number), hosting, onboarding time.
4. **Market size:** count PEI food-service businesses from StatCan Business Counts 33-10-1097-01. Then Atlantic Canada.
5. **Pilot plan:** 1 PEI agency for 4 weeks, then 5 agencies, then the province.
6. **Risks:** food safety, liability, staff adoption, AI mistakes. Write how we reduce each one.
7. **Legal:** check PEI's food donor liability law (search "PEI Food Donors Encouragement Act"). Cite it if it exists.

### R5. Rest of the report
1. Write sections 6-11 using screenshots from Yosef and numbers from Fahd.
2. Leave clear placeholders like `[FAHD: meals saved]` until 2:00 pm.

### R6. Brand (30 min max)
1. Choose 2 colours and a font. Make a simple logo with an AI image tool.
2. Send them to Yosef by 10:00 am so the app matches.

**Checkpoint 2 (2:00 pm):** You receive Fahd's final numbers. Put them in the report.

## Block 3: Fri 2:00-8:30 pm

1. Write the executive summary **last**, once all numbers are final. Keep it to 1.5 pages or less.
2. Check every judging criterion in `TEAM_PLAN.md` section 3. Each one needs a clear, labelled answer in the report.
3. Proof-read with Yosef. Cut anything that does not support a judging criterion.
4. Export to PDF as `Innovation_RescueFit_1_Project.pdf`. The total length must be 5-10 pages, plus the executive summary.
5. Pitch deck draft (X9), only if time is left. Otherwise do it next week for the Dec 4 pitch, if we are finalists.

## Ready-to-use AI prompts

Executive summary:
> Here is our full report [paste]. Write an executive summary of at most 1.5 pages for the IMPAC 2026 Innovation stream. Cover the problem, the solution, key findings with numbers, and expected benefits. Use plain words for a mixed audience of chefs, analysts, and business judges. Do not add any number that is not in the report.

Judge check:
> Act as a strict IMPAC judge. Score this report from 1 to 10 on each criterion: Problem Definition, Innovation, Solution Design, Impact & Value Creation, Feasibility & Adoption, Growth & Sustainability. For each criterion, name the single weakest sentence or missing piece, and say how to fix it.

## Rules
- Every number needs a source in `docs/sources.md`.
- Never invent a quote. Use a real reply, or leave the validation section as "outreach sent, awaiting reply".
