import { describe, expect, it } from "vitest";
import { buildVitestCapabilityShimAliasMap } from "./bundled-capability-runtime.js";

describe("buildVitestCapabilityShimAliasMap", () => {
  it("keeps scoped and unscoped capability shim aliases aligned", () => {
    const aliasMap = buildVitestCapabilityShimAliasMap();

    expect(aliasMap["littlebaby/plugin-sdk/llm-task"]).toBe(
      aliasMap["@littlebaby/plugin-sdk/llm-task"],
    );
    expect(aliasMap["littlebaby/plugin-sdk/config-runtime"]).toBe(
      aliasMap["@littlebaby/plugin-sdk/config-runtime"],
    );
    expect(aliasMap["littlebaby/plugin-sdk/media-runtime"]).toBe(
      aliasMap["@littlebaby/plugin-sdk/media-runtime"],
    );
    expect(aliasMap["littlebaby/plugin-sdk/provider-onboard"]).toBe(
      aliasMap["@littlebaby/plugin-sdk/provider-onboard"],
    );
    expect(aliasMap["littlebaby/plugin-sdk/speech-core"]).toBe(
      aliasMap["@littlebaby/plugin-sdk/speech-core"],
    );
  });
});
