"use client";

import { useState } from "react";

import type { FitResult } from "@/lib/fit";
import { Stamp, type StampTone } from "./document";

/*
 * The waybill: the ruled table of lines that is the centre of the document.
 *
 * Two raises from the roll live here.
 *
 * From the window-box toy shelf: a line is both the summary and the detail.
 * It tears open in place to show its reason and its redirect, so a volunteer
 * never navigates away from the list to find out why.
 *
 * From hand-processed film: wear is bound to the event. The red ink appears
 * only on the line with the lowest day count, never as a page-wide mood.
 */

const DECISION: Record<
  FitResult["decision"],
  { label: string; tone: StampTone }
> = {
  accept: { label: "Accept", tone: "accept" },
  "accept-part": { label: "Accept part", tone: "part" },
  redirect: { label: "Redirect", tone: "redirect" },
};

const STORAGE_LABEL: Record<string, string> = {
  fridge: "Fridge",
  freezer: "Freezer",
  dry: "Dry",
};

export function Waybill({
  results,
  animate = false,
}: {
  results: FitResult[];
  animate?: boolean;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const soonest = results.reduce(
    (low, result) => Math.min(low, result.item.shelf_life_days),
    Number.POSITIVE_INFINITY,
  );

  return (
    <div className="form-box overflow-hidden">
      {/* The column headings, printed into the form's own dark band. */}
      <div className="hidden bg-ink px-3 py-1.5 md:block">
        <div className="typed grid grid-cols-[1.75rem_minmax(0,2.4fr)_4.5rem_4.5rem_4.5rem_5rem_7.5rem] items-center gap-2 text-[0.625rem] tracking-[0.1em] text-manila uppercase">
          <span>Ln</span>
          <span>Item and category</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Est kg</span>
          <span>Store</span>
          <span className="text-right">Days left</span>
          <span className="text-right">Decision</span>
        </div>
      </div>

      <ul>
        {results.map((result, index) => {
          const decision = DECISION[result.decision];
          const dying = result.item.shelf_life_days === soonest;
          const open = openIndex === index;

          return (
            <li
              key={`${result.item.name}-${index}`}
              className={`border-t border-ink-faint first:border-t-0 ${
                dying ? "bg-stamp/7" : "bg-stock"
              }`}
            >
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenIndex(open ? null : index)}
                className="w-full cursor-pointer px-3 py-2.5 text-left transition-colors hover:bg-stock-shade"
              >
                <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_7.5rem] items-center gap-2 md:grid-cols-[1.75rem_minmax(0,2.4fr)_4.5rem_4.5rem_4.5rem_5rem_7.5rem]">
                  <span
                    className={`typed text-[0.75rem] ${
                      dying ? "text-stamp" : "text-ink-faint"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="min-w-0">
                    <span className="block truncate text-[0.9375rem] font-600 text-ink">
                      {result.item.name}
                    </span>
                    <span className="typed block text-[0.6875rem] text-carbon">
                      {result.item.category}
                      <span className="md:hidden">
                        {" "}
                        &middot; {result.item.qty} {result.item.unit} &middot;{" "}
                        {result.item.est_kg} kg &middot;{" "}
                        {STORAGE_LABEL[result.item.storage]}
                      </span>
                    </span>
                  </span>

                  <span className="typed hidden text-right text-[0.8125rem] md:block">
                    {result.item.qty}
                    <span className="text-[0.625rem] text-ink-faint">
                      {" "}
                      {result.item.unit}
                    </span>
                  </span>

                  <span className="typed hidden text-right text-[0.8125rem] md:block">
                    {result.item.est_kg.toFixed(1)}
                  </span>

                  <span className="typed hidden text-[0.75rem] text-ink-soft md:block">
                    {STORAGE_LABEL[result.item.storage]}
                  </span>

                  {/*
                   * The day count is the number the user forgets, so it is
                   * the largest figure on the line.
                   */}
                  <span
                    className={`typed hidden text-right text-[1.0625rem] leading-none md:block ${
                      dying ? "font-700 text-stamp" : "text-ink"
                    }`}
                  >
                    {result.item.shelf_life_days}
                    <span className="block text-[0.5625rem] font-400 tracking-[0.08em] text-ink-faint uppercase">
                      {dying ? "first to go" : "days"}
                    </span>
                  </span>

                  <span className="flex items-center justify-end gap-1.5">
                    <Stamp
                      tone={decision.tone}
                      animate={animate}
                      className={animate ? "" : undefined}
                    >
                      {decision.label}
                    </Stamp>
                    <span
                      aria-hidden="true"
                      className={`typed text-[0.625rem] text-ink-faint transition-transform ${
                        open ? "rotate-90" : ""
                      }`}
                    >
                      &#9656;
                    </span>
                  </span>
                </div>

                <span className="typed mt-1 block text-[0.625rem] text-ink-faint md:hidden">
                  {result.item.shelf_life_days} days left &middot;{" "}
                  {open ? "hide the reason" : "tap for the reason"}
                </span>
              </button>

              {/* The stub, torn open in place. */}
              {open ? (
                <div className="border-t border-dashed border-ink-faint bg-stock-shade px-3 pt-3 pb-4">
                  <p className="field-label mb-1">Reason</p>
                  <p className="max-w-[72ch] text-[0.875rem] leading-relaxed text-ink">
                    {result.reason}
                  </p>

                  <div className="typed mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[0.6875rem] text-ink-soft">
                    <span>
                      KEEP <strong className="text-ink">{result.accepted_kg} kg</strong>
                    </span>
                    <span>
                      REDIRECT{" "}
                      <strong className="text-ink">
                        {result.redirected_kg} kg
                      </strong>
                    </span>
                    {result.unplaced_kg > 0 ? (
                      <span className="text-stamp">
                        NO HOME YET{" "}
                        <strong>{result.unplaced_kg} kg</strong>
                      </span>
                    ) : null}
                    <span>
                      READ CONFIDENCE{" "}
                      <strong className="text-ink">
                        {Math.round(result.item.confidence * 100)}%
                      </strong>
                    </span>
                  </div>

                  {result.redirect_to ? (
                    <p className="mt-3 border-l-2 border-stamp bg-stock py-2 pl-3 text-[0.875rem] text-ink">
                      <span className="field-label mb-0.5 block">
                        Routed to
                      </span>
                      <strong>{result.redirect_to.name}</strong>,{" "}
                      {result.redirect_to.town} &middot;{" "}
                      <span className="typed">
                        {result.redirect_to.distance_km} km
                      </span>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
