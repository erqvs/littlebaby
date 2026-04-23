import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { withTempDir } from "./test-helpers/temp-dir.js";
import {
  ensureDir,
  resolveConfigDir,
  resolveHomeDir,
  resolveUserPath,
  shortenHomeInString,
  shortenHomePath,
  sleep,
} from "./utils.js";

describe("ensureDir", () => {
  it("creates nested directory", async () => {
    await withTempDir({ prefix: "littlebaby-test-" }, async (tmp) => {
      const target = path.join(tmp, "nested", "dir");
      await ensureDir(target);
      expect(fs.existsSync(target)).toBe(true);
    });
  });
});

describe("sleep", () => {
  it("resolves after delay using fake timers", async () => {
    vi.useFakeTimers();
    const promise = sleep(1000);
    vi.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});

describe("resolveConfigDir", () => {
  it("prefers ~/.littlebaby when legacy dir is missing", async () => {
    await withTempDir({ prefix: "littlebaby-config-dir-" }, async (root) => {
      const newDir = path.join(root, ".littlebaby");
      await fs.promises.mkdir(newDir, { recursive: true });
      const resolved = resolveConfigDir({} as NodeJS.ProcessEnv, () => root);
      expect(resolved).toBe(newDir);
    });
  });

  it("expands LITTLEBABY_STATE_DIR using the provided env", () => {
    const env = {
      HOME: "/tmp/littlebaby-home",
      LITTLEBABY_STATE_DIR: "~/state",
    } as NodeJS.ProcessEnv;

    expect(resolveConfigDir(env)).toBe(path.resolve("/tmp/littlebaby-home", "state"));
  });

  it("falls back to the config file directory when only LITTLEBABY_CONFIG_PATH is set", () => {
    const env = {
      HOME: "/tmp/littlebaby-home",
      LITTLEBABY_CONFIG_PATH: "~/profiles/dev/littlebaby.json",
    } as NodeJS.ProcessEnv;

    expect(resolveConfigDir(env)).toBe(path.resolve("/tmp/littlebaby-home", "profiles", "dev"));
  });
});

describe("resolveHomeDir", () => {
  it("prefers LITTLEBABY_HOME over HOME", () => {
    vi.stubEnv("LITTLEBABY_HOME", "/srv/littlebaby-home");
    vi.stubEnv("HOME", "/home/other");

    expect(resolveHomeDir()).toBe(path.resolve("/srv/littlebaby-home"));

    vi.unstubAllEnvs();
  });
});

describe("shortenHomePath", () => {
  it("uses $LITTLEBABY_HOME prefix when LITTLEBABY_HOME is set", () => {
    vi.stubEnv("LITTLEBABY_HOME", "/srv/littlebaby-home");
    vi.stubEnv("HOME", "/home/other");

    expect(shortenHomePath(`${path.resolve("/srv/littlebaby-home")}/.littlebaby/littlebaby.json`)).toBe(
      "$LITTLEBABY_HOME/.littlebaby/littlebaby.json",
    );

    vi.unstubAllEnvs();
  });
});

describe("shortenHomeInString", () => {
  it("uses $LITTLEBABY_HOME replacement when LITTLEBABY_HOME is set", () => {
    vi.stubEnv("LITTLEBABY_HOME", "/srv/littlebaby-home");
    vi.stubEnv("HOME", "/home/other");

    expect(
      shortenHomeInString(`config: ${path.resolve("/srv/littlebaby-home")}/.littlebaby/littlebaby.json`),
    ).toBe("config: $LITTLEBABY_HOME/.littlebaby/littlebaby.json");

    vi.unstubAllEnvs();
  });
});

describe("resolveUserPath", () => {
  it("expands ~ to home dir", () => {
    expect(resolveUserPath("~", {}, () => "/Users/thoffman")).toBe(path.resolve("/Users/thoffman"));
  });

  it("expands ~/ to home dir", () => {
    expect(resolveUserPath("~/littlebaby", {}, () => "/Users/thoffman")).toBe(
      path.resolve("/Users/thoffman", "littlebaby"),
    );
  });

  it("resolves relative paths", () => {
    expect(resolveUserPath("tmp/dir")).toBe(path.resolve("tmp/dir"));
  });

  it("prefers LITTLEBABY_HOME for tilde expansion", () => {
    vi.stubEnv("LITTLEBABY_HOME", "/srv/littlebaby-home");
    vi.stubEnv("HOME", "/home/other");

    expect(resolveUserPath("~/littlebaby")).toBe(path.resolve("/srv/littlebaby-home", "littlebaby"));

    vi.unstubAllEnvs();
  });

  it("uses the provided env for tilde expansion", () => {
    const env = {
      HOME: "/tmp/littlebaby-home",
      LITTLEBABY_HOME: "/srv/littlebaby-home",
    } as NodeJS.ProcessEnv;

    expect(resolveUserPath("~/littlebaby", env)).toBe(path.resolve("/srv/littlebaby-home", "littlebaby"));
  });

  it("keeps blank paths blank", () => {
    expect(resolveUserPath("")).toBe("");
    expect(resolveUserPath("   ")).toBe("");
  });

  it("returns empty string for undefined/null input", () => {
    expect(resolveUserPath(undefined as unknown as string)).toBe("");
    expect(resolveUserPath(null as unknown as string)).toBe("");
  });
});
