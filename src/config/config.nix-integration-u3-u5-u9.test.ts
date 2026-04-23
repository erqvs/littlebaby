import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_GATEWAY_PORT,
  resolveConfigPathCandidate,
  resolveGatewayPort,
  resolveIsNixMode,
  resolveStateDir,
} from "./config.js";
import { withTempHome } from "./test-helpers.js";

vi.unmock("../version.js");

function envWith(overrides: Record<string, string | undefined>): NodeJS.ProcessEnv {
  // Hermetic env: don't inherit process.env because other tests may mutate it.
  return { ...overrides };
}

describe("Nix integration (U3, U5, U9)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("U3: isNixMode env var detection", () => {
    it("isNixMode is false when LITTLEBABY_NIX_MODE is not set", () => {
      expect(resolveIsNixMode(envWith({ LITTLEBABY_NIX_MODE: undefined }))).toBe(false);
    });

    it("isNixMode is false when LITTLEBABY_NIX_MODE is empty", () => {
      expect(resolveIsNixMode(envWith({ LITTLEBABY_NIX_MODE: "" }))).toBe(false);
    });

    it("isNixMode is false when LITTLEBABY_NIX_MODE is not '1'", () => {
      expect(resolveIsNixMode(envWith({ LITTLEBABY_NIX_MODE: "true" }))).toBe(false);
    });

    it("isNixMode is true when LITTLEBABY_NIX_MODE=1", () => {
      expect(resolveIsNixMode(envWith({ LITTLEBABY_NIX_MODE: "1" }))).toBe(true);
    });
  });

  describe("U5: CONFIG_PATH and STATE_DIR env var overrides", () => {
    it("STATE_DIR defaults to ~/.littlebaby when env not set", () => {
      expect(resolveStateDir(envWith({ LITTLEBABY_STATE_DIR: undefined }))).toMatch(/\.littlebaby$/);
    });

    it("STATE_DIR respects LITTLEBABY_STATE_DIR override", () => {
      expect(resolveStateDir(envWith({ LITTLEBABY_STATE_DIR: "/custom/state/dir" }))).toBe(
        path.resolve("/custom/state/dir"),
      );
    });

    it("STATE_DIR respects LITTLEBABY_HOME when state override is unset", () => {
      const customHome = path.join(path.sep, "custom", "home");
      expect(
        resolveStateDir(envWith({ LITTLEBABY_HOME: customHome, LITTLEBABY_STATE_DIR: undefined })),
      ).toBe(path.join(path.resolve(customHome), ".littlebaby"));
    });

    it("CONFIG_PATH defaults to LITTLEBABY_HOME/.littlebaby/littlebaby.json", () => {
      const customHome = path.join(path.sep, "custom", "home");
      expect(
        resolveConfigPathCandidate(
          envWith({
            LITTLEBABY_HOME: customHome,
            LITTLEBABY_CONFIG_PATH: undefined,
            LITTLEBABY_STATE_DIR: undefined,
          }),
        ),
      ).toBe(path.join(path.resolve(customHome), ".littlebaby", "littlebaby.json"));
    });

    it("CONFIG_PATH defaults to ~/.littlebaby/littlebaby.json when env not set", () => {
      expect(
        resolveConfigPathCandidate(
          envWith({ LITTLEBABY_CONFIG_PATH: undefined, LITTLEBABY_STATE_DIR: undefined }),
        ),
      ).toMatch(/\.littlebaby[\\/]littlebaby\.json$/);
    });

    it("CONFIG_PATH respects LITTLEBABY_CONFIG_PATH override", () => {
      expect(
        resolveConfigPathCandidate(
          envWith({ LITTLEBABY_CONFIG_PATH: "/nix/store/abc/littlebaby.json" }),
        ),
      ).toBe(path.resolve("/nix/store/abc/littlebaby.json"));
    });

    it("CONFIG_PATH expands ~ in LITTLEBABY_CONFIG_PATH override", async () => {
      await withTempHome(async (home) => {
        expect(
          resolveConfigPathCandidate(
            envWith({ LITTLEBABY_HOME: home, LITTLEBABY_CONFIG_PATH: "~/.littlebaby/custom.json" }),
            () => home,
          ),
        ).toBe(path.join(home, ".littlebaby", "custom.json"));
      });
    });

    it("CONFIG_PATH uses STATE_DIR when only state dir is overridden", () => {
      expect(
        resolveConfigPathCandidate(
          envWith({ LITTLEBABY_STATE_DIR: "/custom/state", LITTLEBABY_TEST_FAST: "1" }),
          () => path.join(path.sep, "tmp", "littlebaby-config-home"),
        ),
      ).toBe(path.join(path.resolve("/custom/state"), "littlebaby.json"));
    });
  });

  describe("U6: gateway port resolution", () => {
    it("uses default when env and config are unset", () => {
      expect(resolveGatewayPort({}, envWith({ LITTLEBABY_GATEWAY_PORT: undefined }))).toBe(
        DEFAULT_GATEWAY_PORT,
      );
    });

    it("prefers LITTLEBABY_GATEWAY_PORT over config", () => {
      expect(
        resolveGatewayPort(
          { gateway: { port: 19002 } },
          envWith({ LITTLEBABY_GATEWAY_PORT: "19001" }),
        ),
      ).toBe(19001);
    });

    it("falls back to config when env is invalid", () => {
      expect(
        resolveGatewayPort(
          { gateway: { port: 19003 } },
          envWith({ LITTLEBABY_GATEWAY_PORT: "nope" }),
        ),
      ).toBe(19003);
    });
  });
});
