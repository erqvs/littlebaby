import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCliCommand } from "./command-format.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./profile.js";

describe("parseCliProfileArgs", () => {
  it("leaves gateway --dev for subcommands", () => {
    const res = parseCliProfileArgs([
      "node",
      "littlebaby",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "littlebaby", "gateway", "--dev", "--allow-unconfigured"]);
  });

  it("leaves gateway --dev for subcommands after leading root options", () => {
    const res = parseCliProfileArgs([
      "node",
      "littlebaby",
      "--no-color",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual([
      "node",
      "littlebaby",
      "--no-color",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
  });

  it("still accepts global --dev before subcommand", () => {
    const res = parseCliProfileArgs(["node", "littlebaby", "--dev", "gateway"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "littlebaby", "gateway"]);
  });

  it("parses --profile value and strips it", () => {
    const res = parseCliProfileArgs(["node", "littlebaby", "--profile", "work", "status"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "littlebaby", "status"]);
  });

  it("parses interleaved --profile after the command token", () => {
    const res = parseCliProfileArgs(["node", "littlebaby", "status", "--profile", "work", "--deep"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "littlebaby", "status", "--deep"]);
  });

  it("parses interleaved --dev after the command token", () => {
    const res = parseCliProfileArgs(["node", "littlebaby", "status", "--dev"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "littlebaby", "status"]);
  });

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "littlebaby", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it.each([
    ["--dev first", ["node", "littlebaby", "--dev", "--profile", "work", "status"]],
    ["--profile first", ["node", "littlebaby", "--profile", "work", "--dev", "status"]],
    ["interleaved after command", ["node", "littlebaby", "status", "--profile", "work", "--dev"]],
  ])("rejects combining --dev with --profile (%s)", (_name, argv) => {
    const res = parseCliProfileArgs(argv);
    expect(res.ok).toBe(false);
  });
});

describe("applyCliProfileEnv", () => {
  it("fills env defaults for dev profile", () => {
    const env: Record<string, string | undefined> = {};
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    const expectedStateDir = path.join(path.resolve("/home/peter"), ".littlebaby-dev");
    expect(env.LITTLEBABY_PROFILE).toBe("dev");
    expect(env.LITTLEBABY_STATE_DIR).toBe(expectedStateDir);
    expect(env.LITTLEBABY_CONFIG_PATH).toBe(path.join(expectedStateDir, "littlebaby.json"));
    expect(env.LITTLEBABY_GATEWAY_PORT).toBe("19001");
  });

  it("does not override explicit env values", () => {
    const env: Record<string, string | undefined> = {
      LITTLEBABY_STATE_DIR: "/custom",
      LITTLEBABY_GATEWAY_PORT: "19099",
    };
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    expect(env.LITTLEBABY_STATE_DIR).toBe("/custom");
    expect(env.LITTLEBABY_GATEWAY_PORT).toBe("19099");
    expect(env.LITTLEBABY_CONFIG_PATH).toBe(path.join("/custom", "littlebaby.json"));
  });

  it("uses LITTLEBABY_HOME when deriving profile state dir", () => {
    const env: Record<string, string | undefined> = {
      LITTLEBABY_HOME: "/srv/littlebaby-home",
      HOME: "/home/other",
    };
    applyCliProfileEnv({
      profile: "work",
      env,
      homedir: () => "/home/fallback",
    });

    const resolvedHome = path.resolve("/srv/littlebaby-home");
    expect(env.LITTLEBABY_STATE_DIR).toBe(path.join(resolvedHome, ".littlebaby-work"));
    expect(env.LITTLEBABY_CONFIG_PATH).toBe(
      path.join(resolvedHome, ".littlebaby-work", "littlebaby.json"),
    );
  });
});

describe("formatCliCommand", () => {
  it.each([
    {
      name: "no profile is set",
      cmd: "littlebaby doctor --fix",
      env: {},
      expected: "littlebaby doctor --fix",
    },
    {
      name: "profile is default",
      cmd: "littlebaby doctor --fix",
      env: { LITTLEBABY_PROFILE: "default" },
      expected: "littlebaby doctor --fix",
    },
    {
      name: "profile is Default (case-insensitive)",
      cmd: "littlebaby doctor --fix",
      env: { LITTLEBABY_PROFILE: "Default" },
      expected: "littlebaby doctor --fix",
    },
    {
      name: "profile is invalid",
      cmd: "littlebaby doctor --fix",
      env: { LITTLEBABY_PROFILE: "bad profile" },
      expected: "littlebaby doctor --fix",
    },
    {
      name: "--profile is already present",
      cmd: "littlebaby --profile work doctor --fix",
      env: { LITTLEBABY_PROFILE: "work" },
      expected: "littlebaby --profile work doctor --fix",
    },
    {
      name: "--dev is already present",
      cmd: "littlebaby --dev doctor",
      env: { LITTLEBABY_PROFILE: "dev" },
      expected: "littlebaby --dev doctor",
    },
  ])("returns command unchanged when $name", ({ cmd, env, expected }) => {
    expect(formatCliCommand(cmd, env)).toBe(expected);
  });

  it("inserts --profile flag when profile is set", () => {
    expect(formatCliCommand("littlebaby doctor --fix", { LITTLEBABY_PROFILE: "work" })).toBe(
      "littlebaby --profile work doctor --fix",
    );
  });

  it("trims whitespace from profile", () => {
    expect(formatCliCommand("littlebaby doctor --fix", { LITTLEBABY_PROFILE: "  jblittlebaby  " })).toBe(
      "littlebaby --profile jblittlebaby doctor --fix",
    );
  });

  it("handles command with no args after littlebaby", () => {
    expect(formatCliCommand("littlebaby", { LITTLEBABY_PROFILE: "test" })).toBe(
      "littlebaby --profile test",
    );
  });

  it("handles pnpm wrapper", () => {
    expect(formatCliCommand("pnpm littlebaby doctor", { LITTLEBABY_PROFILE: "work" })).toBe(
      "pnpm littlebaby --profile work doctor",
    );
  });

  it("inserts --container when a container hint is set", () => {
    expect(
      formatCliCommand("littlebaby gateway status --deep", { LITTLEBABY_CONTAINER_HINT: "demo" }),
    ).toBe("littlebaby --container demo gateway status --deep");
  });

  it("ignores unsafe container hints", () => {
    expect(
      formatCliCommand("littlebaby gateway status --deep", {
        LITTLEBABY_CONTAINER_HINT: "demo; rm -rf /",
      }),
    ).toBe("littlebaby gateway status --deep");
  });

  it("preserves both --container and --profile hints", () => {
    expect(
      formatCliCommand("littlebaby doctor", {
        LITTLEBABY_CONTAINER_HINT: "demo",
        LITTLEBABY_PROFILE: "work",
      }),
    ).toBe("littlebaby --container demo doctor");
  });

  it("does not prepend --container for update commands", () => {
    expect(formatCliCommand("littlebaby update", { LITTLEBABY_CONTAINER_HINT: "demo" })).toBe(
      "littlebaby update",
    );
    expect(
      formatCliCommand("pnpm littlebaby update --channel beta", { LITTLEBABY_CONTAINER_HINT: "demo" }),
    ).toBe("pnpm littlebaby update --channel beta");
  });
});
