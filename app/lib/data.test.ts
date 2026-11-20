import { describe, expect, it } from "vitest";

import { clientWarning } from "./data";

/*
 * The browser must never be told a path or a name.
 *
 * Two sentences describe the same fact. .warning names the missing file and
 * the person whose fixture stood in for it, which is what the server log is
 * for. clientWarning() is the one that is safe to render, because this app
 * is public and has no login, so anything on the page is public too.
 *
 * This test exists because the API routes were fixed and app/fit/page.tsx
 * was missed, which put "public/data/agencies.json is missing. Using
 * Yosef's dev fixture." on a public page.
 */

describe("clientWarning", () => {
  it("says nothing when the real data loaded", () => {
    expect(clientWarning({ value: {}, source: "data" })).toBe(
      null,
    );
  });

  it("never leaks the path or the name the developer warning carries", () => {
    const developerWarning =
      "public/data/agencies.json is missing. Using Yosef's dev fixture.";

    const shown = clientWarning({
      value: {},
      source: "fixture",
      warning: developerWarning,
    });

    expect(shown).toBeTruthy();
    expect(shown).not.toContain("public/data");
    expect(shown).not.toContain(".json");
    expect(shown).not.toContain("Yosef");
    expect(shown).not.toContain("fixture");
  });

  it("still tells the reader the numbers are not the real ones", () => {
    const shown = clientWarning({
      value: {},
      source: "fixture",
      warning: "anything",
    });

    expect(shown).toContain("sample data");
  });
});
