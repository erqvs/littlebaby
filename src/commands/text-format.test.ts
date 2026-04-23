import { describe, expect, it } from "vitest";
import { shortenText } from "./text-format.js";

describe("shortenText", () => {
  it("returns original text when it fits", () => {
    expect(shortenText("littlebaby", 16)).toBe("littlebaby");
  });

  it("truncates and appends ellipsis when over limit", () => {
    expect(shortenText("littlebaby-status-output", 10)).toBe("littlebaby-…");
  });

  it("counts multi-byte characters correctly", () => {
    expect(shortenText("hello🙂world", 7)).toBe("hello🙂…");
  });
});
