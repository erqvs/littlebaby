import { describe, expect, it } from "vitest";
import { buildPlatformRuntimeLogHints, buildPlatformServiceStartHints } from "./runtime-hints.js";

describe("buildPlatformRuntimeLogHints", () => {
  it("renders launchd log hints on darwin", () => {
    expect(
      buildPlatformRuntimeLogHints({
        platform: "darwin",
        env: {
          LITTLEBABY_STATE_DIR: "/tmp/littlebaby-state",
          LITTLEBABY_LOG_PREFIX: "gateway",
        },
        systemdServiceName: "littlebaby-gateway",
        windowsTaskName: "LittleBaby Gateway",
      }),
    ).toEqual([
      "Launchd stdout (if installed): /tmp/littlebaby-state/logs/gateway.log",
      "Launchd stderr (if installed): /tmp/littlebaby-state/logs/gateway.err.log",
      "Restart attempts: /tmp/littlebaby-state/logs/gateway-restart.log",
    ]);
  });

  it("renders systemd and windows hints by platform", () => {
    expect(
      buildPlatformRuntimeLogHints({
        platform: "linux",
        env: {
          LITTLEBABY_STATE_DIR: "/tmp/littlebaby-state",
        },
        systemdServiceName: "littlebaby-gateway",
        windowsTaskName: "LittleBaby Gateway",
      }),
    ).toEqual([
      "Logs: journalctl --user -u littlebaby-gateway.service -n 200 --no-pager",
      "Restart attempts: /tmp/littlebaby-state/logs/gateway-restart.log",
    ]);
    expect(
      buildPlatformRuntimeLogHints({
        platform: "win32",
        env: {
          LITTLEBABY_STATE_DIR: "/tmp/littlebaby-state",
        },
        systemdServiceName: "littlebaby-gateway",
        windowsTaskName: "LittleBaby Gateway",
      }),
    ).toEqual([
      'Logs: schtasks /Query /TN "LittleBaby Gateway" /V /FO LIST',
      "Restart attempts: /tmp/littlebaby-state/logs/gateway-restart.log",
    ]);
  });
});

describe("buildPlatformServiceStartHints", () => {
  it("builds platform-specific service start hints", () => {
    expect(
      buildPlatformServiceStartHints({
        platform: "darwin",
        installCommand: "littlebaby gateway install",
        startCommand: "littlebaby gateway",
        launchAgentPlistPath: "~/Library/LaunchAgents/com.littlebaby.gateway.plist",
        systemdServiceName: "littlebaby-gateway",
        windowsTaskName: "LittleBaby Gateway",
      }),
    ).toEqual([
      "littlebaby gateway install",
      "littlebaby gateway",
      "launchctl bootstrap gui/$UID ~/Library/LaunchAgents/com.littlebaby.gateway.plist",
    ]);
    expect(
      buildPlatformServiceStartHints({
        platform: "linux",
        installCommand: "littlebaby gateway install",
        startCommand: "littlebaby gateway",
        launchAgentPlistPath: "~/Library/LaunchAgents/com.littlebaby.gateway.plist",
        systemdServiceName: "littlebaby-gateway",
        windowsTaskName: "LittleBaby Gateway",
      }),
    ).toEqual([
      "littlebaby gateway install",
      "littlebaby gateway",
      "systemctl --user start littlebaby-gateway.service",
    ]);
  });
});
