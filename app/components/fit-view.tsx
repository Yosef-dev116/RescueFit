"use client";

import Link from "next/link";
import { useMemo } from "react";

import {
  ArrowIcon,
  Box,
  FieldLabel,
  ModeBadge,
  StorageGauge,
} from "@/components/document";
import { Waybill } from "@/components/waybill";
import { checkFit } from "@/lib/fit";
import type { Agency, IntakeItem, Mode, StorageType } from "@/lib/schemas";
import { saveAgencyId, useAgencyId, useConsignment } from "@/lib/store";

/*
 * The fit check, on screen.
 *
 * The engine is pure TypeScript, so it runs here in the browser. Changing
 * the receiving kitchen re-decides every line at once, with no round trip,
 * which is what makes the three gauges worth watching.
 *
 * It never opens empty. With no logged donation it decides the sample one
 * and says so, because a judge following a link from the report has to see
 * the product work.
 */

export function FitView({
  agencies,
  sampleItems,
  kgPerMeal,
  dataWarnings,
}: {
  agencies: Agency[];
  sampleItems: IntakeItem[];
  kgPerMeal: number;
  dataWarnings: string[];
}) {
  // The choice lives in sessionStorage, so /plan writes its menu for the
  // same kitchen. An unknown stored id falls back to the first kitchen.
  const storedAgencyId = useAgencyId();
  const agencyId = storedAgencyId ?? agencies[0]?.id ?? "";

  // sessionStorage is an external store, so it is read with
  // useSyncExternalStore rather than copied into state by an effect. It is
  // null on the server and on the first client render, which is why the
  // sample donation is the fallback rather than an empty state.
  const stored = useConsignment();
  const logged = stored && stored.items.length > 0 ? stored : null;

  const items: IntakeItem[] = logged ? logged.items : sampleItems;
  const mode: Mode = logged ? logged.mode : "demo";
  const origin: "photo" | "text" | "sample" = logged ? logged.origin : "sample";

  const agency = agencies.find((a) => a.id === agencyId) ?? agencies[0];

  const report = useMemo(
    () => checkFit({ items, agency, others: agencies, kgPerMeal }),
    [items, agency, agencies, kgPerMeal],
  );

  const claimed = useMemo(() => {
    const totals: Record<StorageType, number> = {
      fridge: 0,
      freezer: 0,
      dry: 0,
    };
    for (const result of report.results) {
      totals[result.item.storage] += result.accepted_kg;
    }
    return totals;
  }, [report]);

  const originLine = {
    photo: "read from your photo",
    text: "read from the donor's message",
    sample: "a sample delivery, because nothing is logged yet",
  }[origin];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <FieldLabel>Section 02</FieldLabel>
          <h1 className="placard mt-0.5 text-[2.25rem] text-ink sm:text-[2.75rem]">
            Fit check
          </h1>
          <p className="typed mt-1.5 text-[0.75rem] text-ink-soft">
            {items.length} lines &middot; {originLine}
          </p>
        </div>
        <ModeBadge mode={mode} />
      </div>

      {/* The kitchen picker. A form chooses its receiving party in a box. */}
      <Box className="mt-6 p-4">
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
          <div className="min-w-[16rem] flex-1">
            <label htmlFor="agency" className="field-label mb-1 block">
              Box 2 &middot; Receiving kitchen
            </label>
            <select
              id="agency"
              value={agencyId}
              onChange={(event) => saveAgencyId(event.target.value)}
              className="typed w-full cursor-pointer border border-ink bg-stock-shade px-2.5 py-2 text-[0.875rem] text-ink focus:bg-stock focus:outline-none"
            >
              {agencies.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} &mdash; {option.town}
                </option>
              ))}
            </select>
          </div>

          <dl className="typed flex flex-wrap gap-x-6 gap-y-2 text-[0.75rem]">
            <div>
              <dt className="field-label">Meals per day</dt>
              <dd className="mt-0.5 text-[1rem] text-ink">
                {agency.meals_per_day}
              </dd>
            </div>
            <div>
              <dt className="field-label">Diet rules</dt>
              <dd className="mt-0.5 text-[0.875rem] text-ink">
                {agency.diet_flags.length > 0
                  ? agency.diet_flags.join(", ")
                  : "none recorded"}
              </dd>
            </div>
            <div>
              <dt className="field-label">kg per meal</dt>
              <dd className="mt-0.5 text-[1rem] text-ink">
                {kgPerMeal.toFixed(2)}
              </dd>
            </div>
          </dl>
        </div>
      </Box>

      {/* The three gauges, before the lines, because space frames the read. */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StorageGauge
          label="Fridge"
          freeKg={agency.free_kg.fridge}
          capacityKg={agency.capacity_kg.fridge}
          claimedKg={claimed.fridge}
        />
        <StorageGauge
          label="Freezer"
          freeKg={agency.free_kg.freezer}
          capacityKg={agency.capacity_kg.freezer}
          claimedKg={claimed.freezer}
        />
        <StorageGauge
          label="Dry store"
          freeKg={agency.free_kg.dry}
          capacityKg={agency.capacity_kg.dry}
          claimedKg={claimed.dry}
        />
      </div>

      <div className="mt-6">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <FieldLabel>Box 5 &middot; Decisions, line by line</FieldLabel>
          <p className="typed text-[0.6875rem] text-ink-faint">
            tap a line for its reason
          </p>
        </div>

        <Waybill results={report.results} animate />

        <div className="mt-px grid grid-cols-2 gap-px bg-ink-faint sm:grid-cols-4">
          {[
            { label: "Offered", value: `${report.totals.offered_kg} kg` },
            { label: "Kept here", value: `${report.totals.accepted_kg} kg` },
            {
              label: "Routed onward",
              value: `${report.totals.redirected_kg} kg`,
            },
            {
              label: "No home yet",
              value: `${report.totals.unplaced_kg} kg`,
              alarm: report.totals.unplaced_kg > 0,
            },
          ].map((total) => (
            <div key={total.label} className="bg-stock px-3 py-2">
              <FieldLabel>{total.label}</FieldLabel>
              <p
                className={`typed mt-0.5 text-[1.125rem] ${
                  total.alarm ? "text-stamp" : "text-ink"
                }`}
              >
                {total.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {dataWarnings.length > 0 ? (
        <div className="form-box-quiet mt-4 px-3 py-2">
          <FieldLabel>Data note</FieldLabel>
          <ul className="typed mt-1 space-y-0.5 text-[0.75rem] text-ink-soft">
            {dataWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="perforation mt-10" aria-hidden="true" />

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/plan"
          className="placard border-2 border-ink bg-stamp px-4 py-2.5 text-[0.9375rem] text-stock no-underline transition-colors hover:bg-ink"
        >
          Plan the kept food <ArrowIcon className="ml-1.5 inline-block align-[-0.05em]" />
        </Link>
        <Link
          href="/intake"
          className="typed border border-ink-faint bg-stock px-3.5 py-2.5 text-[0.75rem] text-carbon no-underline transition-colors hover:border-ink hover:text-ink"
        >
          LOG A DIFFERENT DONATION
        </Link>
      </div>
    </>
  );
}
