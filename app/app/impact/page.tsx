import { Box, EmptyField, FieldLabel } from "@/components/document";
import { loadScenarioResults } from "@/lib/data";

/*
 * FAHD OWNS THIS PAGE (features C5 and C6).
 *
 * This is a placeholder that Yosef wrote so the nav never leads to a 404.
 * Replace the whole body. Keep nothing here except the layout wrapper if
 * you do not want it.
 *
 * What is already done for you:
 *
 * - loadScenarioResults() reads public/data/scenario_results.json, validates
 *   it against TEAM_PLAN section 6, and falls back to a dev fixture with a
 *   warning. loadImpactFactors() and loadForecast() work the same way.
 * - .value is typed. .source is "data" or "fixture". .warning says why.
 * - recharts is installed. Charts must live in a "use client" component,
 *   because recharts needs the browser.
 * - The form-paper design system is in app/globals.css, and the shared
 *   parts are in components/document.tsx: Box, FieldLabel, FormSection,
 *   EmptyField, Stamp, ModeBadge, StorageGauge.
 * - Put every figure in a <span className="typed"> so the numerals line up
 *   in columns. Reserve text-stamp (the red) for the one number that is a
 *   warning, so it keeps its meaning.
 */

export const metadata = {
  title: "Impact: kg saved, meals, CO2e, dollars | RescueFit",
  description:
    "What RescueFit saves across a 30-day simulation of the PEI food " +
    "rescue network, against the same network without it.",
};

export default function ImpactPage() {
  const scenario = loadScenarioResults();
  const { baseline, rescuefit } = scenario.value;

  const wasteAvoided = baseline.kg_wasted_at_agency - rescuefit.kg_wasted_at_agency;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <FieldLabel>Section 04</FieldLabel>
      <h1 className="placard mt-0.5 text-[2.25rem] text-ink sm:text-[2.75rem]">
        Impact
      </h1>

      <div className="mt-4 border-2 border-carbon bg-stock p-4">
        <FieldLabel>Owner</FieldLabel>
        <p className="mt-1 max-w-[70ch] text-[0.9375rem] leading-relaxed text-ink">
          Fahd builds this page, features C5 and C6. The numbers below come
          straight from{" "}
          <span className="typed text-[0.8125rem] text-carbon">
            scenario_results.json
          </span>{" "}
          through the validated loader, so the wiring is proven. The charts
          and the layout are his.
        </p>
        <p className="typed mt-2 text-[0.75rem] text-ink-soft">
          DATA SOURCE: {scenario.source.toUpperCase()}
          {scenario.warning ? ` — ${scenario.warning}` : ""}
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Waste avoided",
            value: `${wasteAvoided.toLocaleString("en-CA")} kg`,
          },
          {
            label: "Extra meals",
            value: (rescuefit.meals - baseline.meals).toLocaleString("en-CA"),
          },
          {
            label: "CO2e avoided",
            value: `${(baseline.co2e_kg - rescuefit.co2e_kg).toLocaleString("en-CA")} kg`,
          },
          {
            label: "Value retained",
            value: `$${(baseline.cad - rescuefit.cad).toLocaleString("en-CA")}`,
          },
        ].map((stat) => (
          <Box key={stat.label} className="p-4">
            <FieldLabel>{stat.label}</FieldLabel>
            <p className="typed mt-1 text-[1.5rem] leading-none text-ink">
              {stat.value}
            </p>
            <p className="typed mt-1.5 text-[0.625rem] text-ink-faint">
              over {scenario.value.days} days, {scenario.value.donors} donors,{" "}
              {scenario.value.agencies} agencies
            </p>
          </Box>
        ))}
      </div>

      <div className="mt-6">
        <EmptyField
          label="Box 10 &middot; Daily waste chart, baseline against RescueFit"
          hint="Fahd: a recharts area or line chart over scenario.value.daily goes here. Keep it in a client component."
        />
      </div>

      <div className="mt-3">
        <EmptyField
          label="Box 11 &middot; Donation forecast, next seven days"
          hint="Fahd: loadForecast() returns predicted_kg with a low and high band, ready for a chart."
        />
      </div>
    </div>
  );
}
