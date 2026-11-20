/*
 * Menu rules for a kitchen's diet flags.
 *
 * The flags arrive from the browser, so they never go into the prompt as
 * text. Each known flag maps to a fixed rule written here, the same way
 * dietConflict() in fit.ts reads them: by prefix. Unknown flags are counted
 * and dropped, so the caller can say so.
 */
const RULES: [prefix: string, rule: string][] = [
  [
    "halal",
    "The kitchen is halal. Add no pork, ham, bacon, lard, gelatin, alcohol, " +
      "or meat that is not halal, in any dish or ingredient.",
  ],
  [
    "vegetarian",
    "The kitchen is vegetarian. Add no meat, poultry, fish, or seafood, " +
      "and no stock, sauce, or fat made from them.",
  ],
];

const MAX_FLAGS = 10;

export function dietRules(flags: unknown): { rules: string[]; ignored: number } {
  if (!Array.isArray(flags)) return { rules: [], ignored: 0 };
  const rules = new Set<string>();
  let ignored = 0;
  for (const flag of flags.slice(0, MAX_FLAGS)) {
    const normalised = typeof flag === "string" ? flag.trim().toLowerCase() : "";
    const match = RULES.find(([prefix]) => normalised.startsWith(prefix));
    if (match) rules.add(match[1]);
    else ignored += 1;
  }
  ignored += Math.max(0, flags.length - MAX_FLAGS);
  return { rules: [...rules], ignored };
}
