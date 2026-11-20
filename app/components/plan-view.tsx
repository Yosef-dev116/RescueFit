"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  Box,
  EmptyField,
  FieldLabel,
  ModeBadge,
} from "@/components/document";
import { checkFit } from "@/lib/fit";
import { PlanSchema, type Agency, type IntakeItem, type Mode, type Plan } from "@/lib/schemas";
import { readConsignment } from "@/lib/store";

/*
 * The use-first plan.
 *
 * The page decides which items the kitchen actually kept, by running the
 * fit engine first, and asks for a menu over those items only. Planning
 * meals around food that was redirected would be a lie.
 */

type Status =
  | { kind: "loading" }
  | { kind: "ready"; plan: Plan; mode: Mode; warnings: string[] }
  | { kind: "error"; message: string };

export function PlanView({
  agency,
  sampleItems,
  kgPerMeal,
}: {
  agency: Agency;
  sampleItems: IntakeItem[];
  kgPerMeal: number;
}) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [kept, setKept] = useState<IntakeItem[]>([]);

  const build = useCallback(async () => {
    setStatus({ kind: "loading" });

    const stored = readConsignment();
    const items = stored && stored.items.length > 0 ? stored.items : sampleItems;

    // Only the food this kitchen keeps gets planned.
    const report = checkFit({ items, agency, kgPerMeal });
    const keptItems = report.results
      .filter((result) => result.accepted_kg > 0)
      .map((result) => ({ ...result.item, est_kg: result.accepted_kg }));

    setKept(keptItems);

    if (keptItems.length === 0) {
      setStatus({
        kind: "error",
        message:
          "This kitchen kept nothing from the donation, so there is no " +
          "menu to write. Pick a different kitchen on the fit check.",
      });
      return;
    }

    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: keptItems,
          meals_per_day: agency.meals_per_day,
          kitchen: agency.name,
        }),
      });

      const data = (await response.json()) as unknown;
      if (!response.ok) {
        const error = (data as { error?: string }).error;
        throw new Error(error ?? `The plan failed (${response.status}).`);
      }

      const checked = PlanSchema.safeParse((data as { plan?: unknown }).plan);
      if (!checked.success) {
        throw new Error("The menu did not arrive in a shape this page shows.");
      }

      setStatus({
        kind: "ready",
        plan: checked.data,
        mode: (data as { mode?: Mode }).mode === "live" ? "live" : "demo",
        warnings: (data as { warnings?: string[] }).warnings ?? [],
      });
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error ? error.message : "The plan request failed.",
      });
    }
  }, [agency, kgPerMeal, sampleItems]);

  useEffect(() => {
    void build();
  }, [build]);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <FieldLabel>Section 03</FieldLabel>
          <h1 className="placard mt-0.5 text-[2.25rem] text-ink sm:text-[2.75rem]">
            Use-first plan
          </h1>
          <p className="typed mt-1.5 text-[0.75rem] text-ink-soft">
            {agency.name} &middot; {agency.meals_per_day} meals per day
            &middot; {kept.length} kept items
          </p>
        </div>
        {status.kind === "ready" ? <ModeBadge mode={status.mode} /> : null}
      </div>

      <p className="mt-5 max-w-[68ch] text-[0.9375rem] leading-relaxed text-ink-soft">
        The kept items are sorted by the days they have left before the menu
        is written, and anything with two days or fewer is placed on day one.
        Redirected food is left out, because planning meals around food that
        went somewhere else would be a lie.
      </p>

      {/* The kept roster, so the reader can check the plan against it. */}
      {kept.length > 0 ? (
        <Box className="mt-6 overflow-hidden">
          <p className="typed border-b border-ink bg-ink px-3 py-1.5 text-[0.6875rem] tracking-[0.14em] text-manila uppercase">
            Box 7 &middot; Kept food, soonest expiry first
          </p>
          <ul className="divide-y divide-ink-faint">
            {[...kept]
              .sort(
                (a, b) =>
                  a.shelf_life_days - b.shelf_life_days || b.est_kg - a.est_kg,
              )
              .map((item, index) => (
                <li
                  key={`${item.name}-${index}`}
                  className="flex items-baseline justify-between gap-3 px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-[0.9375rem] text-ink">
                    <span className="typed mr-2 text-[0.6875rem] text-ink-faint">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item.name}
                  </span>
                  <span className="typed text-[0.8125rem] text-ink-soft">
                    {item.est_kg.toFixed(1)} kg
                  </span>
                  <span
                    className={`typed w-[5.5rem] text-right text-[0.8125rem] ${
                      index === 0 ? "font-700 text-stamp" : "text-ink"
                    }`}
                  >
                    {item.shelf_life_days} day
                    {item.shelf_life_days === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
          </ul>
        </Box>
      ) : null}

      {/* Loading. The form says which field it is filling. */}
      {status.kind === "loading" ? (
        <div className="mt-6" role="status">
          <EmptyField
            label="Box 8 &middot; Writing the three-day menu"
            hint="Sorting by expiry, then drafting the meals and the prep list."
          />
        </div>
      ) : null}

      {status.kind === "error" ? (
        <div className="mt-6 border-2 border-stamp bg-stamp/10 p-4" role="alert">
          <FieldLabel className="text-stamp">Refused</FieldLabel>
          <p className="mt-1 max-w-[62ch] text-[0.9375rem] text-ink">
            {status.message}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void build()}
              className="typed cursor-pointer border border-ink bg-stock px-3 py-2 text-[0.6875rem] text-ink transition-colors hover:bg-ink hover:text-stock"
            >
              TRY AGAIN
            </button>
            <Link
              href="/fit"
              className="typed border border-ink-faint bg-stock px-3 py-2 text-[0.6875rem] text-carbon no-underline transition-colors hover:border-ink hover:text-ink"
            >
              BACK TO THE FIT CHECK
            </Link>
          </div>
        </div>
      ) : null}

      {status.kind === "ready" ? (
        <>
          {status.plan.waste_warning ? (
            <div className="mt-6 border-2 border-stamp bg-stock p-4">
              <FieldLabel className="text-stamp">
                Box 8a &middot; At risk today
              </FieldLabel>
              <p className="mt-1 max-w-[66ch] text-[1rem] leading-relaxed text-ink">
                {status.plan.waste_warning}
              </p>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {status.plan.days.map((day) => (
              <Box key={day.day} className="overflow-hidden">
                <div className="flex items-baseline justify-between gap-2 border-b border-ink bg-stock-shade px-3 py-2">
                  <p className="placard text-[1.0625rem] text-ink">
                    {day.date_label}
                  </p>
                  <p className="typed text-[0.6875rem] text-carbon">
                    DAY {day.day}
                  </p>
                </div>
                <ul className="divide-y divide-dashed divide-ink-faint">
                  {day.meals.map((meal, index) => (
                    <li key={`${meal.name}-${index}`} className="px-3 py-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[0.9375rem] font-600 text-ink">
                          {meal.name}
                        </p>
                        <p className="typed shrink-0 text-[0.75rem] text-ink-soft">
                          {meal.servings}
                          <span className="text-[0.625rem] text-ink-faint">
                            {" "}
                            srv
                          </span>
                        </p>
                      </div>
                      {meal.uses.length > 0 ? (
                        <p className="typed mt-1 text-[0.6875rem] text-carbon">
                          USES: {meal.uses.join(", ")}
                        </p>
                      ) : null}
                      {meal.note ? (
                        <p className="mt-1.5 max-w-[42ch] text-[0.8125rem] leading-relaxed text-ink-soft">
                          {meal.note}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </Box>
            ))}
          </div>

          {status.plan.prep_list.length > 0 ? (
            <Box className="mt-4 overflow-hidden">
              <p className="typed border-b border-ink bg-ink px-3 py-1.5 text-[0.6875rem] tracking-[0.14em] text-manila uppercase">
                Box 9 &middot; Prep list, in order
              </p>
              <ol className="divide-y divide-ink-faint">
                {status.plan.prep_list.map((step, index) => (
                  <li
                    key={`${step}-${index}`}
                    className="flex gap-3 px-3 py-2.5"
                  >
                    {/* A tick box, because this is a checklist on a form. */}
                    <span
                      aria-hidden="true"
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 border border-ink bg-stock-shade"
                    />
                    <span className="max-w-[78ch] text-[0.9375rem] leading-relaxed text-ink">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </Box>
          ) : null}

          {status.warnings.length > 0 ? (
            <div className="mt-4 border-l-2 border-carbon bg-stock px-3 py-2">
              <FieldLabel>Data note</FieldLabel>
              <ul className="typed mt-1 space-y-0.5 text-[0.75rem] text-ink-soft">
                {status.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
