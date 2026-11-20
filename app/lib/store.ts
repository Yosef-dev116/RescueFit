"use client";

import { useSyncExternalStore } from "react";

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

/** Fires when this tab writes, because "storage" only fires in other tabs. */
const CHANGED = "rescuefit:consignment-changed";

export function saveConsignment(value: Omit<Consignment, "savedAt">): void {
  if (typeof window === "undefined") return;
  const payload: Consignment = { ...value, savedAt: new Date().toISOString() };
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(payload));
    window.dispatchEvent(new Event(CHANGED));
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
    window.dispatchEvent(new Event(CHANGED));
  } catch {
    // Nothing to do. An unreadable store is the same as an empty one.
  }
}

// --------------------------------------------------------------- the hook

/*
 * sessionStorage is an external store, so React reads it with
 * useSyncExternalStore rather than with an effect that sets state. An
 * effect would cause a cascading render on every mount, and React now
 * reports that as an error.
 *
 * getSnapshot has to return the same object when nothing changed, or React
 * re-renders forever. So the raw string is cached and only re-parsed when
 * the string itself differs.
 */

let cachedRaw: string | null = null;
let cachedValue: Consignment | null = null;

function getSnapshot(): Consignment | null {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(KEY);
  } catch {
    raw = null;
  }

  if (raw === cachedRaw) return cachedValue;

  cachedRaw = raw;
  cachedValue = readConsignment();
  return cachedValue;
}

/** The server has no sessionStorage, so it always renders the sample. */
function getServerSnapshot(): Consignment | null {
  return null;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * The logged donation, or null when nothing is logged.
 *
 * It is null on the server and on the first client render, so a page using
 * it must have a sensible answer for null. Both callers fall back to the
 * sample donation, which is what keeps /fit and /plan from opening empty.
 */
export function useConsignment(): Consignment | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
