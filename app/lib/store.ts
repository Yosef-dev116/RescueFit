"use client";

import { IntakeResponseSchema, type IntakeItem, type Mode } from "./schemas";

/**
 * Cross-page state for the demo path.
 *
 * The intake page writes the item list, and the fit and plan pages read it.
 * It lives in sessionStorage, not in the URL, for two reasons. A query
 * string long enough to hold a donation is unreadable, and reading
 * searchParams would drag a Suspense boundary into every page.
 *
 * Both pages fall back to a sample donation when storage is empty, so a
 * judge who opens /fit directly still sees a working decision.
 */

const KEY = "rescuefit.consignment.v1";

export type Consignment = {
  items: IntakeItem[];
  mode: Mode;
  /** How the items arrived, for the line at the top of the fit page. */
  origin: "photo" | "text" | "sample";
  savedAt: string;
};

export function saveConsignment(value: Omit<Consignment, "savedAt">): void {
  if (typeof window === "undefined") return;
  const payload: Consignment = { ...value, savedAt: new Date().toISOString() };
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // Private browsing can refuse storage. The sample donation covers it.
  }
}

export function readConsignment(): Consignment | null {
  if (typeof window === "undefined") return null;

  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    const checked = IntakeResponseSchema.safeParse(parsed);
    if (!checked.success) return null;

    const record = parsed as Partial<Consignment>;
    return {
      items: checked.data.items,
      mode: record.mode === "live" ? "live" : "demo",
      origin:
        record.origin === "photo" || record.origin === "text"
          ? record.origin
          : "sample",
      savedAt: typeof record.savedAt === "string" ? record.savedAt : "",
    };
  } catch {
    return null;
  }
}

export function clearConsignment(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to do. An unreadable store is the same as an empty one.
  }
}
