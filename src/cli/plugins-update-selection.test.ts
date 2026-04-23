import { describe, expect, it } from "vitest";
import type { PluginInstallRecord } from "../config/types.plugins.js";
import { resolvePluginUpdateSelection } from "./plugins-update-selection.js";

function createNpmInstall(params: {
  spec: string;
  installPath?: string;
  resolvedName?: string;
}): PluginInstallRecord {
  return {
    source: "npm",
    spec: params.spec,
    installPath: params.installPath ?? "/tmp/plugin",
    ...(params.resolvedName ? { resolvedName: params.resolvedName } : {}),
  };
}

describe("resolvePluginUpdateSelection", () => {
  it("maps an explicit unscoped npm dist-tag update to the tracked plugin id", () => {
    expect(
      resolvePluginUpdateSelection({
        installs: {
          "littlebaby-codex-app-server": createNpmInstall({
            spec: "littlebaby-codex-app-server",
            installPath: "/tmp/littlebaby-codex-app-server",
            resolvedName: "littlebaby-codex-app-server",
          }),
        },
        rawId: "littlebaby-codex-app-server@beta",
      }),
    ).toEqual({
      pluginIds: ["littlebaby-codex-app-server"],
      specOverrides: {
        "littlebaby-codex-app-server": "littlebaby-codex-app-server@beta",
      },
    });
  });

  it("maps an explicit scoped npm dist-tag update to the tracked plugin id", () => {
    expect(
      resolvePluginUpdateSelection({
        installs: {
          "voice-call": createNpmInstall({
            spec: "@littlebaby/voice-call",
            installPath: "/tmp/voice-call",
            resolvedName: "@littlebaby/voice-call",
          }),
        },
        rawId: "@littlebaby/voice-call@beta",
      }),
    ).toEqual({
      pluginIds: ["voice-call"],
      specOverrides: {
        "voice-call": "@littlebaby/voice-call@beta",
      },
    });
  });

  it("maps an explicit npm version update to the tracked plugin id", () => {
    expect(
      resolvePluginUpdateSelection({
        installs: {
          "littlebaby-codex-app-server": createNpmInstall({
            spec: "littlebaby-codex-app-server",
            installPath: "/tmp/littlebaby-codex-app-server",
            resolvedName: "littlebaby-codex-app-server",
          }),
        },
        rawId: "littlebaby-codex-app-server@0.2.0-beta.4",
      }),
    ).toEqual({
      pluginIds: ["littlebaby-codex-app-server"],
      specOverrides: {
        "littlebaby-codex-app-server": "littlebaby-codex-app-server@0.2.0-beta.4",
      },
    });
  });

  it("keeps recorded npm tags when update is invoked by plugin id", () => {
    expect(
      resolvePluginUpdateSelection({
        installs: {
          "littlebaby-codex-app-server": createNpmInstall({
            spec: "littlebaby-codex-app-server@beta",
            installPath: "/tmp/littlebaby-codex-app-server",
            resolvedName: "littlebaby-codex-app-server",
          }),
        },
        rawId: "littlebaby-codex-app-server",
      }),
    ).toEqual({
      pluginIds: ["littlebaby-codex-app-server"],
    });
  });
});
