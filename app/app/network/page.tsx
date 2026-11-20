import { Box, FieldLabel, ModeBadge } from "@/components/document";
import { loadAgencies } from "@/lib/data";
import { haversineKm } from "@/lib/fit";

import { NetworkMap } from "./map";

/*
 * The network page (feature C3): the agency map and the roster.
 *
 * The distance column uses haversineKm() from lib/fit.ts, the same function
 * the redirect decision uses, so this page and the fit check can never
 * disagree about a distance.
 */

export const metadata = {
  title: "Network: where surplus goes | RescueFit",
  description:
    "The PEI food rescue agencies RescueFit can route surplus to, with " +
    "their free space per storage type.",
};

export default function NetworkPage() {
  const agencies = loadAgencies();
  const home = agencies.value[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <FieldLabel>Section 05</FieldLabel>
          <h1 className="placard mt-0.5 text-[2.25rem] text-ink sm:text-[2.75rem]">
            Network
          </h1>
        </div>
        {/*
          * The agency roster is sample data until the real one is published,
          * and a table of named PEI agencies with capacities reads as a
          * survey result. Say which it is, where the reader looks first.
          */}
        <ModeBadge mode="demo" />
      </div>

      {/*
        * Addressed to the reader, not to the team. See the note in
        * app/impact/page.tsx: the instructions belong in the comment at the
        * top of this file, where a visitor never sees them.
        */}
      <div className="form-box mt-4 p-4">
        <FieldLabel>What this page shows</FieldLabel>
        <p className="mt-1 max-w-[70ch] text-[0.9375rem] leading-relaxed text-ink">
          Every agency RescueFit can route surplus to, with the space each
          one has free. The distance column uses the same calculation the
          redirect decision uses, so this page and the fit check can never
          disagree about how far away an agency is.
        </p>
        <p className="typed mt-2 text-[0.75rem] text-ink-soft">
          DATA SOURCE: {agencies.source.toUpperCase()}
          {agencies.source === "fixture"
            ? " \u2014 sample agencies. The surveyed roster is not published yet."
            : ""}
        </p>
      </div>

      <div className="mt-6">
        <NetworkMap agencies={agencies.value} homeId={home.id} />
      </div>

      <Box className="mt-4 overflow-hidden">
        <p className="typed border-b border-ink bg-ink px-3 py-1.5 text-[0.6875rem] tracking-[0.14em] text-manila uppercase">
          Box 13 &middot; Agencies, with free space
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <thead>
              <tr className="typed border-b border-ink bg-stock-shade text-[0.625rem] tracking-[0.1em] uppercase">
                <th className="px-3 py-1.5 font-normal">Agency</th>
                <th className="px-3 py-1.5 font-normal">Town</th>
                <th className="px-3 py-1.5 text-right font-normal">Fridge</th>
                <th className="px-3 py-1.5 text-right font-normal">Freezer</th>
                <th className="px-3 py-1.5 text-right font-normal">Dry</th>
                <th className="px-3 py-1.5 text-right font-normal">Meals/day</th>
                <th className="px-3 py-1.5 text-right font-normal">Distance</th>
              </tr>
            </thead>
            <tbody>
              {agencies.value.map((agency) => (
                <tr
                  key={agency.id}
                  className="border-b border-ink-faint last:border-b-0"
                >
                  <td className="px-3 py-2 text-[0.875rem] font-semibold text-ink">
                    {agency.name}
                    {agency.diet_flags.length > 0 ? (
                      <span className="typed mt-0.5 block text-[0.625rem] text-stamp">
                        {agency.diet_flags.join(", ")}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-[0.875rem] text-ink-soft">
                    {agency.town}
                  </td>
                  <td className="typed px-3 py-2 text-right text-[0.8125rem]">
                    {agency.free_kg.fridge}
                  </td>
                  <td className="typed px-3 py-2 text-right text-[0.8125rem]">
                    {agency.free_kg.freezer}
                  </td>
                  <td className="typed px-3 py-2 text-right text-[0.8125rem]">
                    {agency.free_kg.dry}
                  </td>
                  <td className="typed px-3 py-2 text-right text-[0.8125rem]">
                    {agency.meals_per_day}
                  </td>
                  <td className="typed px-3 py-2 text-right text-[0.8125rem] text-ink-soft">
                    {agency.id === home.id
                      ? "—"
                      : `${haversineKm(home, agency).toFixed(0)} km`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Box>

      <p className="typed mt-3 text-[0.6875rem] text-ink-faint">
        Distances are great-circle kilometres from {home.name}. Road distance
        is longer.
      </p>
    </div>
  );
}
