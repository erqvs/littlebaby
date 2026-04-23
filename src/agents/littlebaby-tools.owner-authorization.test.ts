import { describe, expect, it } from "vitest";
import {
  isLittleBabyOwnerOnlyCoreToolName,
  LITTLEBABY_OWNER_ONLY_CORE_TOOL_NAMES,
} from "./tools/owner-only-tools.js";

describe("createLittleBabyTools owner authorization", () => {
  it("marks owner-only core tool names", () => {
    expect(LITTLEBABY_OWNER_ONLY_CORE_TOOL_NAMES).toEqual(["cron", "gateway", "nodes"]);
    expect(isLittleBabyOwnerOnlyCoreToolName("cron")).toBe(true);
    expect(isLittleBabyOwnerOnlyCoreToolName("gateway")).toBe(true);
    expect(isLittleBabyOwnerOnlyCoreToolName("nodes")).toBe(true);
  });

  it("keeps canvas non-owner-only", () => {
    expect(isLittleBabyOwnerOnlyCoreToolName("canvas")).toBe(false);
  });
});
