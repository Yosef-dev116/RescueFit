import Link from "next/link";

import { Box, FieldLabel, FormSection, ModeBadge, Stamp, StorageGauge } from "@/components/document";
import { IntakeControl } from "@/components/intake-control";
import { Waybill } from "@/components/waybill";
import { loadAgencies, loadImpactFactors } from "@/lib/data";
import { checkFit } from "@/lib/fit";
import { sampleConsignment } from "@/lib/sample";

/*
 * The landing page.
 *
 * It does not claim that the fit check works. It runs it. The waybill below
 * is the real engine's output on the sample donation, computed on this
 * request, and the arithmetic in every reason line is the same arithmetic a
 * volunteer gets on their own delivery.
 */

export default function Home() {
  const agencies = loadAgencies();
  const factors = loadImpactFactors();

  const home = agencies.value[0];
  const items = sampleConsignment();
  const report = checkFit({
    items,
    agency: home,
    others: agencies.value,
    kgPerMeal: factors.value.kg_per_meal,
  });

  const today = new Date().toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  // Any line that sends food on, which is a full redirect or the surplus
  // part of an accept-part. Do not call these "redirected": the stamp
  // column shows one REDIRECT, so that label reads as a contradiction.
  const linesRoutedOnward = report.results.filter(
    (result) => result.redirected_kg > 0,
  ).length;

  const claimed = { fridge: 0, freezer: 0, dry: 0 } as Record<string, number>;
  for (const result of report.results) {
    claimed[result.item.storage] += result.accepted_kg;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
      {/* ---------------------------------------------- the consignment head */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <FieldLabel>Receiving kitchen</FieldLabel>
          <h1 className="placard mt-0.5 max-w-[22ch] text-[1.75rem] text-ink sm:max-w-[30ch] sm:text-[2.25rem]">
            {home.name}
          </h1>
          <p className="typed mt-1.5 text-[0.75rem] text-ink-soft">
            {home.town}, PE &middot; {home.meals_per_day} meals per day
            &middot; logged {today}
          </p>
        </div>

        <div className="flex flex-col items-start gap-2 sm:items-end">
          <ModeBadge mode="demo" />
          <p className="typed max-w-[34ch] text-[0.6875rem] leading-snug text-ink-soft sm:text-right">
            The lines below are the real fit engine running on a sample
            delivery. The arithmetic is live. The photo reading is not.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------ the thesis, in one line */}
      {/*
        * The thesis holds one line each way on a 1440 viewport. The contract
        * puts the waybill in the upper two thirds and the intake control in
        * the footer of the same screen, so prose here is paid for out of
        * that budget. The longer telling of it lives under the tear line.
        */}
      <p className="mt-2 max-w-[34ch] text-[1.25rem] leading-[1.2] font-600 tracking-[-0.02em] text-ink sm:max-w-[74ch] sm:text-[1.5rem]">
        Food rescue finds the food. Nobody tells the kitchen whether it fits.
        <span className="mt-1 block max-w-[78ch] text-[0.9375rem] leading-[1.45] font-400 tracking-normal text-ink-soft">
          Snap the delivery. Every line is stamped, with the arithmetic shown.
        </span>
      </p>

      {/* --------------------------------------------------- box 5: the waybill */}
      <div className="mt-3">
        <div className="mb-1.5 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <FieldLabel>
            Box 5 &middot; Consignment lines, as read and decided
          </FieldLabel>
          <p className="typed text-[0.6875rem] text-ink-faint">
            tap a line for its reason
          </p>
        </div>

        <Waybill results={report.results} animate />

        {/* The totals strip a real form prints under its table. */}
        <div className="mt-px grid grid-cols-2 gap-px bg-ink-faint sm:grid-cols-4">
          {[
            { label: "Offered", value: `${report.totals.offered_kg} kg` },
            { label: "Kept here", value: `${report.totals.accepted_kg} kg` },
            {
              label: "Routed onward",
              value: `${report.totals.redirected_kg} kg`,
            },
            {
              label: "Lines routed onward",
              value: `${linesRoutedOnward} of ${report.results.length}`,
            },
          ].map((total) => (
            <div key={total.label} className="bg-stock px-3 py-1.5">
              <FieldLabel>{total.label}</FieldLabel>
              <p className="typed mt-0.5 text-[1.0625rem] text-ink">
                {total.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------- box 6: the primary action */}
      <div className="mt-2">
        <IntakeControl />
      </div>

      {/* The tear line that closes the first viewport. */}
      <div className="perforation mt-3" aria-hidden="true" />

      {/* ------------------------------------------------ the next form begins */}
      <FormSection
        index="07"
        title="Space, as it stands"
        note="one gauge owns one truth"
      >
        <p className="mb-4 max-w-[68ch] text-[0.9375rem] leading-relaxed text-ink-soft">
          Space is the limit a kitchen can see. Time is the one it forgets.
          Each gauge holds the free kilograms in one storage type, with the
          hatched band showing what this delivery would claim before anyone
          commits to it.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <StorageGauge
            label="Fridge"
            freeKg={home.free_kg.fridge}
            capacityKg={home.capacity_kg.fridge}
            claimedKg={claimed.fridge}
          />
          <StorageGauge
            label="Freezer"
            freeKg={home.free_kg.freezer}
            capacityKg={home.capacity_kg.freezer}
            claimedKg={claimed.freezer}
          />
          <StorageGauge
            label="Dry store"
            freeKg={home.free_kg.dry}
            capacityKg={home.capacity_kg.dry}
            claimedKg={claimed.dry}
          />
        </div>
      </FormSection>

      <FormSection
        index="08"
        title="What the stamp means"
        note="the rules, in full"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              stamp: "Accept",
              tone: "accept" as const,
              body:
                "There is room in the right storage type, and the kitchen " +
                "can plate the whole amount before it expires.",
            },
            {
              stamp: "Accept part",
              tone: "part" as const,
              body:
                "One limit binds. Either the shelf runs out, or the days " +
                "run out at this kitchen's meals per day. The line says " +
                "which, with the numbers.",
            },
            {
              stamp: "Redirect",
              tone: "redirect" as const,
              body:
                "Nothing can be kept: no space, no time, or a diet rule " +
                "this kitchen keeps. The nearest agency with room for the " +
                "whole amount is named.",
            },
          ].map((rule) => (
            <Box key={rule.stamp} className="p-4">
              <Stamp tone={rule.tone}>{rule.stamp}</Stamp>
              <p className="mt-3 max-w-[44ch] text-[0.875rem] leading-relaxed text-ink-soft">
                {rule.body}
              </p>
            </Box>
          ))}
        </div>

        <Box quiet className="mt-3 p-4">
          <FieldLabel>Why the model does not decide</FieldLabel>
          <p className="mt-1 max-w-[74ch] text-[0.875rem] leading-relaxed text-ink-soft">
            Claude reads the photo and nothing else. Free space, shelf life,
            meals per day, diet rules, and the redirect distance are plain
            arithmetic in{" "}
            <span className="typed text-[0.8125rem] text-carbon">
              lib/fit.ts
            </span>
            , under unit test. A kitchen manager can check any line by hand,
            which is the point: a decision nobody can audit is a decision
            nobody will follow.
          </p>
        </Box>
      </FormSection>

      <FormSection index="09" title="The rest of the record">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              href: "/plan",
              index: "03",
              title: "Use-first plan",
              body: "A three-day menu that cooks the soonest expiry first.",
            },
            {
              href: "/impact",
              index: "04",
              title: "Impact",
              body: "Kilograms saved, meals, CO2e, and dollars.",
            },
            {
              href: "/network",
              index: "05",
              title: "Network",
              body: "The PEI agencies, and where surplus actually goes.",
            },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="form-box group block p-4 no-underline transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-[2px_4px_8px_-2px_rgba(28,26,22,0.28)]"
            >
              <span className="typed text-[0.625rem] text-stamp">
                {card.index}
              </span>
              <span className="placard mt-1 block text-[1.0625rem] text-ink group-hover:text-stamp">
                {card.title}
              </span>
              <span className="mt-1.5 block max-w-[34ch] text-[0.875rem] leading-relaxed text-ink-soft">
                {card.body}
              </span>
            </Link>
          ))}
        </div>
      </FormSection>
    </div>
  );
}
