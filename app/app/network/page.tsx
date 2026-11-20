import { Box, FieldLabel } from "@/components/document";
import { loadAgencies } from "@/lib/data";
import { haversineKm } from "@/lib/fit";

import { NetworkMap } from "./map";

/*
 * FAHD OWNS THIS PAGE (feature C3).
 *
 * Yosef wrote this placeholder so the nav never leads to a 404, and so the
 * Leaflet pattern is already proven. See app/network/map.tsx for the
 * dynamic import with ssr: false, which is the part that bites.
 *
 * haversineKm() from lib/fit.ts is exported for your distance column, and
 * it is the same function the redirect decision uses, so the map and the
 * fit page can never disagree about a distance.
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
      <FieldLabel>Section 05</FieldLabel>
      <h1 className="placard mt-0.5 text-[2.25rem] text-ink sm:text-[2.75rem]">
        Network
      </h1>

      <div className="mt-4 border-2 border-carbon bg-stock p-4">
        <FieldLabel>Owner</FieldLabel>
        <p className="mt-1 max-w-[70ch] text-[0.9375rem] leading-relaxed text-ink">
          Fahd builds this page, feature C3. The agency table below is live
          from{" "}
          <span className="typed text-[0.8125rem] text-carbon">
            agencies.json
          </span>
          , and the distance column uses the same{" "}
          <span className="typed text-[0.8125rem] text-carbon">
            haversineKm()
          </span>{" "}
          the redirect decision uses, so the map and the fit page can never
          disagree.
        </p>
        <p className="typed mt-2 text-[0.75rem] text-ink-soft">
          DATA SOURCE: {agencies.source.toUpperCase()}
          {agencies.warning ? ` — ${agencies.warning}` : ""}
        </p>
      </div>

      <div className="mt-6">
        <NetworkMap />
      </div>

      <Box className="mt-4 overflow-hidden">
        <p className="typed border-b border-ink bg-ink px-3 py-1.5 text-[0.6875rem] tracking-[0.14em] text-manila uppercase">
          Box 13 &middot; Agencies, with free space
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <thead>
              <tr className="typed border-b border-ink bg-stock-shade text-[0.625rem] tracking-[0.1em] uppercase">
                <th className="px-3 py-1.5 font-400">Agency</th>
                <th className="px-3 py-1.5 font-400">Town</th>
                <th className="px-3 py-1.5 text-right font-400">Fridge</th>
                <th className="px-3 py-1.5 text-right font-400">Freezer</th>
                <th className="px-3 py-1.5 text-right font-400">Dry</th>
                <th className="px-3 py-1.5 text-right font-400">Meals/day</th>
                <th className="px-3 py-1.5 text-right font-400">Distance</th>
              </tr>
            </thead>
            <tbody>
              {agencies.value.map((agency) => (
                <tr
                  key={agency.id}
                  className="border-b border-ink-faint last:border-b-0"
                >
                  <td className="px-3 py-2 text-[0.875rem] font-600 text-ink">
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
