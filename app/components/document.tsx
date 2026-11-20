import type { ReactNode } from "react";

import type { Mode } from "@/lib/schemas";

/*
 * The parts of the document that every page shares.
 *
 * Nothing here is a generic card. A box is a ruled field on a form, a label
 * is a typed field name, and an empty field shows its ruling rather than
 * blank space.
 */

/*
 * The icon set. Three marks, drawn, sharing one stroke width and one cap
 * style, so they read as a set and not as whatever the font happened to
 * carry. They were typographic glyphs before, which left the stroke weight
 * to the font designer and changed with the face.
 *
 * Each one is decorative. Every caller already states the meaning in words
 * beside it, so they are hidden from a screen reader.
 */

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** The disclosure mark on a line that tears open. */
export function CaretIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      width="9"
      height="9"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M4.5 2.5 8.5 6l-4 3.5" {...STROKE} />
    </svg>
  );
}

/** Forward, to the next step of the same job. */
export function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 12"
      width="13"
      height="10"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M1.5 6h12m-4.5-4.5L13.5 6 9 10.5" {...STROKE} />
    </svg>
  );
}

/** The mode lamp. Filled, because it reads as a lit indicator. */
export function DotIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 8 8"
      width="7"
      height="7"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <circle cx="4" cy="4" r="3" fill="currentColor" />
    </svg>
  );
}

export function FieldLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={`field-label ${className}`}>{children}</p>;
}

/** A numbered section of the form. More space above a heading than below. */
export function FormSection({
  index,
  title,
  note,
  children,
  id,
}: {
  index: string;
  title: string;
  note?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="mt-14 first:mt-0">
      <div className="mb-4 flex items-end gap-3 border-b border-ink pb-2">
        <span className="typed text-[0.8125rem] leading-none text-stamp">
          {index}
        </span>
        <h2 className="placard flex-1 text-[1.375rem] leading-none sm:text-[1.625rem]">
          {title}
        </h2>
        {note ? (
          <span className="typed hidden text-[0.6875rem] text-ink-faint sm:block">
            {note}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** A ruled box. The container the whole surface is built from. */
export function Box({
  children,
  className = "",
  quiet = false,
}: {
  children: ReactNode;
  className?: string;
  quiet?: boolean;
}) {
  return (
    <div className={`${quiet ? "form-box-quiet" : "form-box"} ${className}`}>
      {children}
    </div>
  );
}

/**
 * An empty field. It shows the ruling, so the reader can see that the field
 * exists and is waiting, rather than seeing nothing at all.
 */
export function EmptyField({
  label,
  hint,
  className = "",
}: {
  label: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={`form-box ruled-empty p-5 ${className}`}>
      <div className="bg-stock/95 p-4">
        <FieldLabel>{label}</FieldLabel>
        {hint ? (
          <p className="mt-1 max-w-[52ch] text-[0.875rem] text-ink-soft">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export type StampTone = "accept" | "part" | "redirect" | "neutral";

const STAMP_TONE: Record<StampTone, string> = {
  accept: "text-filed",
  part: "text-carbon",
  redirect: "text-stamp",
  neutral: "text-ink-soft",
};

/**
 * A rubber stamp impression. The decision is a word, never a colour alone,
 * so it still reads for a colour-blind user and in a greyscale printout.
 */
export function Stamp({
  children,
  tone = "neutral",
  animate = false,
  /**
   * Wear this one impression. Pass it only for the event that earns it,
   * which on the waybill is the single line with the lowest day count.
   * Two worn stamps on one surface turn wear back into a page filter.
   */
  worn = false,
  className = "",
}: {
  children: ReactNode;
  tone?: StampTone;
  animate?: boolean;
  worn?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`stamp inline-block text-[0.6875rem] ${STAMP_TONE[tone]} ${
        animate ? "stamp-press" : ""
      } ${worn ? "stamp-worn" : ""} ${className}`}
      style={{ transform: `rotate(${worn ? -3.4 : -2.2}deg)` }}
    >
      {children}
    </span>
  );
}

/**
 * The demo badge.
 *
 * A canned answer must never read as a measured one. This sits where the
 * user is already looking, not in a footnote.
 */
export function ModeBadge({ mode }: { mode: Mode }) {
  if (mode === "live") {
    return (
      <span className="typed inline-flex items-center gap-1.5 border border-filed bg-stock px-2 py-1 text-[0.6875rem] text-filed">
        <DotIcon /> LIVE MODEL READING
      </span>
    );
  }
  return (
    <span className="typed inline-flex items-center gap-1.5 border border-stamp bg-stamp px-2 py-1 text-[0.6875rem] text-stock">
      <DotIcon /> DEMO DATA, NOT A REAL READING
    </span>
  );
}

/**
 * A storage gauge.
 *
 * Donated by the night-flight six-pack: a fixed constellation where each
 * panel owns one truth, and a deviation reads as a trend before it reads as
 * an alarm. So the bar always shows the pending claim next to the used
 * amount, and the kitchen can see where the space is going before it
 * commits.
 */
export function StorageGauge({
  label,
  freeKg,
  capacityKg,
  claimedKg = 0,
}: {
  label: string;
  freeKg: number;
  capacityKg: number;
  claimedKg?: number;
}) {
  const safeCapacity = capacityKg > 0 ? capacityKg : 1;
  const usedKg = Math.max(0, safeCapacity - freeKg);
  const usedPct = Math.min(100, (usedKg / safeCapacity) * 100);
  const claimPct = Math.min(100 - usedPct, (claimedKg / safeCapacity) * 100);
  const leftKg = Math.max(0, freeKg - claimedKg);
  const tight = leftKg <= 0.01;

  return (
    <div className="form-box p-3">
      <div className="flex items-baseline justify-between gap-2">
        <FieldLabel>{label}</FieldLabel>
        {/*
          * The headline is the free space as it stands today, because that
          * is what the section's own prose promises the gauge holds. It used
          * to be the space left after the pending claim, so a fridge with
          * 80 kg free read "0.0 / 300 kg" while the line under it said
          * "claims 80.0 kg". Both figures are named below instead.
          */}
        <span className="typed text-[0.8125rem] text-ink">
          {freeKg.toFixed(1)}
          <span className="text-ink-faint"> / {capacityKg.toFixed(0)} kg</span>
        </span>
      </div>

      <div
        className="mt-2 flex h-5 w-full border border-ink bg-stock-shade"
        role="img"
        aria-label={`${label}: ${freeKg.toFixed(1)} kilograms free of ${capacityKg.toFixed(0)}${
          claimedKg > 0
            ? `, with ${claimedKg.toFixed(1)} kilograms claimed by this donation, leaving ${leftKg.toFixed(1)} kilograms`
            : ""
        }`}
      >
        {/* Already used. Solid ink. */}
        <div
          className="h-full bg-ink-faint transition-[width] duration-500 ease-out"
          style={{ width: `${usedPct}%` }}
        />
        {/* Claimed by this donation. Hatched, because it is pending. */}
        <div
          className="h-full bg-carbon-soft transition-[width] duration-500 ease-out"
          style={{
            width: `${claimPct}%`,
            backgroundImage:
              "repeating-linear-gradient(-45deg, rgba(47,75,110,0.95) 0 4px, rgba(246,243,234,0.85) 4px 8px)",
          }}
        />
      </div>

      {/*
        * The headline above is free space today, so it stays in plain ink:
        * 80 kg free is a fact, not an alarm. The red belongs to the figure
        * that is actually bad news, which is what the delivery leaves.
        */}
      <p className="typed mt-1.5 text-[0.625rem] text-ink-faint">
        {claimedKg > 0 ? (
          <>
            free now &middot; this donation claims {claimedKg.toFixed(1)} kg,
            leaving{" "}
            <span className={tight ? "text-stamp" : "text-ink"}>
              {leftKg.toFixed(1)} kg
            </span>
          </>
        ) : (
          "free now, nothing claimed yet"
        )}
      </p>
    </div>
  );
}
