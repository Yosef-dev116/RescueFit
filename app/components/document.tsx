import type { ReactNode } from "react";

import type { Mode } from "@/lib/schemas";

/*
 * The parts of the document that every page shares.
 *
 * Nothing here is a generic card. A box is a ruled field on a form, a label
 * is a typed field name, and an empty field shows its ruling rather than
 * blank space.
 */

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
  className = "",
}: {
  children: ReactNode;
  tone?: StampTone;
  animate?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`stamp inline-block text-[0.6875rem] ${STAMP_TONE[tone]} ${
        animate ? "stamp-press" : ""
      } ${className}`}
      style={{ transform: "rotate(-2.2deg)" }}
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
        <span aria-hidden="true">&#9679;</span> LIVE MODEL READING
      </span>
    );
  }
  return (
    <span className="typed inline-flex items-center gap-1.5 border border-stamp bg-stamp px-2 py-1 text-[0.6875rem] text-stock">
      <span aria-hidden="true">&#9679;</span> DEMO DATA, NOT A REAL READING
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
        <span
          className={`typed text-[0.8125rem] ${
            tight ? "text-stamp" : "text-ink"
          }`}
        >
          {leftKg.toFixed(1)}
          <span className="text-ink-faint"> / {capacityKg.toFixed(0)} kg</span>
        </span>
      </div>

      <div
        className="mt-2 flex h-5 w-full border border-ink bg-stock-shade"
        role="img"
        aria-label={`${label}: ${leftKg.toFixed(1)} kilograms free of ${capacityKg.toFixed(0)}${
          claimedKg > 0
            ? `, with ${claimedKg.toFixed(1)} kilograms claimed by this donation`
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

      <p className="typed mt-1.5 text-[0.625rem] text-ink-faint">
        {claimedKg > 0
          ? `${claimedKg.toFixed(1)} kg claimed by this donation`
          : "no claim yet"}
      </p>
    </div>
  );
}
