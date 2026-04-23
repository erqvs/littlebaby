import { describe, expect, it } from "vitest";
import { normalizePackageTagInput } from "./package-tag.js";

describe("normalizePackageTagInput", () => {
  const packageNames = ["littlebaby", "@littlebaby/plugin"] as const;

  it.each([
    { input: undefined, expected: null },
    { input: "   ", expected: null },
    { input: "littlebaby@beta", expected: "beta" },
    { input: "@littlebaby/plugin@2026.2.24", expected: "2026.2.24" },
    { input: "littlebaby@   ", expected: null },
    { input: "littlebaby", expected: null },
    { input: " @littlebaby/plugin ", expected: null },
    { input: " latest ", expected: "latest" },
    { input: "@other/plugin@beta", expected: "@other/plugin@beta" },
    { input: "littlebabyer@beta", expected: "littlebabyer@beta" },
  ] satisfies ReadonlyArray<{ input: string | undefined; expected: string | null }>)(
    "normalizes %j",
    ({ input, expected }) => {
      expect(normalizePackageTagInput(input, packageNames)).toBe(expected);
    },
  );
});
