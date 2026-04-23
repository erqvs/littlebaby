import { describe, expect, it } from "vitest";
import type { LittleBabyConfig } from "../config/config.js";
import { resolvePluginUninstallId } from "./plugins-uninstall-selection.js";

describe("resolvePluginUninstallId", () => {
  it("accepts the recorded LittleBabyHub spec as an uninstall target", () => {
    const result = resolvePluginUninstallId({
      rawId: "littlebabyhub:linkmind-context",
      config: {
        plugins: {
          entries: {
            "linkmind-context": { enabled: true },
          },
          installs: {
            "linkmind-context": {
              source: "npm",
              spec: "littlebabyhub:linkmind-context",
              littlebabyhubPackage: "linkmind-context",
            },
          },
        },
      } as LittleBabyConfig,
      plugins: [{ id: "linkmind-context", name: "linkmind-context" }],
    });

    expect(result.pluginId).toBe("linkmind-context");
  });

  it("accepts a versionless LittleBabyHub spec when the install was pinned", () => {
    const result = resolvePluginUninstallId({
      rawId: "littlebabyhub:linkmind-context",
      config: {
        plugins: {
          entries: {
            "linkmind-context": { enabled: true },
          },
          installs: {
            "linkmind-context": {
              source: "npm",
              spec: "littlebabyhub:linkmind-context@1.2.3",
            },
          },
        },
      } as LittleBabyConfig,
      plugins: [{ id: "linkmind-context", name: "linkmind-context" }],
    });

    expect(result.pluginId).toBe("linkmind-context");
  });
});
