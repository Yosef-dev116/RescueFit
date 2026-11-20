import { ArrowIcon, Box, FieldLabel, ModeBadge } from "@/components/document";
import { loadScenarioResults } from "@/lib/data";

import { DailyWasteChart } from "./daily-chart";

/*
 * Impact (features C5 and C6). The figures come from Fahd's scenario model
 * in model/simulate.py. Its output is copied to public/data/
 * scenario_results.json, and loadScenarioResults() checks it against the
 * contract in TEAM_PLAN section 6.
 *
 * Fahd's run has no CO2e or dollar factors yet, so it reports 0 for both.
 * The page shows kilograms and meals instead, and keeps the CO2e and
 * dollar tiles only for the dev fixture, which has those fields filled.
 *
 * The full interactive model (policy comparison, replay by seed, export)
 * is Fahd's static page at public/rescuefit/index.html. This page links
 * to it rather than framing it, because the CSP sets frame-ancestors
 * 'none'.
 */

export const metadata = {
  title: "Impact: food used, waste avoided, meals | RescueFit",
  description:
    "What RescueFit changes across a 30-day simulation of the PEI food " +
    "rescue network, against the same network without it.",
};

function kg(n: number): string {
  return `${Math.round(n).toLocaleString("en-CA")} kg`;
}

export default function ImpactPage() {
  const scenario = loadScenarioResults();
  const { baseline, rescuefit, days, donors, agencies, daily, assumptions } =
    scenario.value;

  const hasMassBalance =
    baseline.kg_used !== undefined && rescuefit.kg_used !== undefined;

  const stats = hasMassBalance
    ? [
        {
          label: "Less expired at kitchens",
          value: kg(baseline.kg_wasted_at_agency - rescuefit.kg_wasted_at_agency),
        },
        {
          label: "More food used",
          value: kg((rescuefit.kg_used ?? 0) - (baseline.kg_used ?? 0)),
        },
        {
          label: "Extra meals",
          value: Math.round(rescuefit.meals - baseline.meals).toLocaleString("en-CA"),
        },
        {
          label: "Redirected to other sites",
          value: kg(rescuefit.kg_redirected ?? 0),
        },
      ]
    : [
        {
          label: "Waste avoided",
          value: kg(baseline.kg_wasted_at_agency - rescuefit.kg_wasted_at_agency),
        },
        {
          label: "Extra meals",
          value: Math.round(rescuefit.meals - baseline.meals).toLocaleString("en-CA"),
        },
        {
          label: "CO2e avoided",
          value: kg(baseline.co2e_kg - rescuefit.co2e_kg),
        },
        {
          label: "Value retained",
          value: `$${Math.round(baseline.cad - rescuefit.cad).toLocaleString("en-CA")}`,
        },
      ];

  const moreUnallocated =
    baseline.kg_unallocated !== undefined && rescuefit.kg_unallocated !== undefined
      ? rescuefit.kg_unallocated - baseline.kg_unallocated
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <FieldLabel>Section 04</FieldLabel>
          <h1 className="placard mt-0.5 text-[2.25rem] text-ink sm:text-[2.75rem]">
            Impact
          </h1>
        </div>
        {/* A simulation, not a measurement, so the badge says so first. */}
        <ModeBadge mode="demo" />
      </div>

      <div className="form-box mt-4 p-4">
        <FieldLabel>What these figures are</FieldLabel>
        <p className="mt-1 max-w-[70ch] text-[0.9375rem] leading-relaxed text-ink">
          A {days}-day simulation of a PEI food rescue network with {donors}{" "}
          donors and {agencies} receiving kitchens, run twice: once as the
          network works today, and once with RescueFit checking fit and
          redirecting surplus. The difference is what you see below. These
          are modelled figures, not a measured result.
        </p>
        {moreUnallocated !== null && moreUnallocated > 0 ? (
          <p className="mt-2 max-w-[70ch] text-[0.9375rem] leading-relaxed text-ink">
            The trade-off: RescueFit leaves{" "}
            <span className="typed">{kg(moreUnallocated)}</span> more food
            unallocated, because kitchens decline what they cannot use in time.
          </p>
        ) : null}
        <p className="typed mt-2 text-[0.75rem] text-ink-soft">
          DATA SOURCE: {scenario.source.toUpperCase()}
          {scenario.source === "fixture"
            ? " — sample figures. The measured run is not published yet."
            : " — model/simulate.py, averaged over paired runs."}
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Box key={stat.label} className="p-4">
            <FieldLabel>{stat.label}</FieldLabel>
            <p className="typed mt-1 text-[1.5rem] leading-none text-ink">
              {stat.value}
            </p>
            <p className="typed mt-1.5 text-[0.625rem] text-ink-faint">
              simulated over {days} days, {donors} donors, {agencies} kitchens
            </p>
          </Box>
        ))}
      </div>

      <Box className="mt-6 p-4">
        <FieldLabel>Food expired at kitchens, day by day</FieldLabel>
        <div className="mt-3">
          <DailyWasteChart
            daily={daily.map((d) => ({
              day: d.day,
              baseline_waste_kg: d.baseline_waste_kg,
              rescuefit_waste_kg: d.rescuefit_waste_kg,
            }))}
          />
        </div>
      </Box>

      <div className="mt-6 grid gap-3 lg:grid-cols-[2fr_1fr]">
        <Box className="p-4">
          <FieldLabel>Model assumptions</FieldLabel>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.875rem] leading-relaxed text-ink">
            {assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Box>
        <a
          href="/rescuefit/index.html#impact"
          className="form-box group block p-4 no-underline transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-[2px_4px_8px_-2px_rgba(28,26,22,0.28)]"
        >
          <FieldLabel>Impact lab</FieldLabel>
          <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink">
            Run the simulation yourself. Compare the policies, replay one run
            day by day, and export the results.
          </p>
          <span className="typed mt-3 inline-flex items-center gap-1 text-[0.75rem] text-stamp">
            OPEN THE IMPACT LAB <ArrowIcon className="h-3 w-3" />
          </span>
        </a>
      </div>
    </div>
  );
}
