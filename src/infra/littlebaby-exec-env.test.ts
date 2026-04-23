import { describe, expect, it } from "vitest";
import {
  ensureLittleBabyExecMarkerOnProcess,
  markLittleBabyExecEnv,
  LITTLEBABY_CLI_ENV_VALUE,
  LITTLEBABY_CLI_ENV_VAR,
} from "./littlebaby-exec-env.js";

describe("markLittleBabyExecEnv", () => {
  it("returns a cloned env object with the exec marker set", () => {
    const env = { PATH: "/usr/bin", LITTLEBABY_CLI: "0" };
    const marked = markLittleBabyExecEnv(env);

    expect(marked).toEqual({
      PATH: "/usr/bin",
      LITTLEBABY_CLI: LITTLEBABY_CLI_ENV_VALUE,
    });
    expect(marked).not.toBe(env);
    expect(env.LITTLEBABY_CLI).toBe("0");
  });
});

describe("ensureLittleBabyExecMarkerOnProcess", () => {
  it.each([
    {
      name: "mutates and returns the provided process env",
      env: { PATH: "/usr/bin" } as NodeJS.ProcessEnv,
    },
    {
      name: "overwrites an existing marker on the provided process env",
      env: { PATH: "/usr/bin", [LITTLEBABY_CLI_ENV_VAR]: "0" } as NodeJS.ProcessEnv,
    },
  ])("$name", ({ env }) => {
    expect(ensureLittleBabyExecMarkerOnProcess(env)).toBe(env);
    expect(env[LITTLEBABY_CLI_ENV_VAR]).toBe(LITTLEBABY_CLI_ENV_VALUE);
  });

  it("defaults to mutating process.env when no env object is provided", () => {
    const previous = process.env[LITTLEBABY_CLI_ENV_VAR];
    delete process.env[LITTLEBABY_CLI_ENV_VAR];

    try {
      expect(ensureLittleBabyExecMarkerOnProcess()).toBe(process.env);
      expect(process.env[LITTLEBABY_CLI_ENV_VAR]).toBe(LITTLEBABY_CLI_ENV_VALUE);
    } finally {
      if (previous === undefined) {
        delete process.env[LITTLEBABY_CLI_ENV_VAR];
      } else {
        process.env[LITTLEBABY_CLI_ENV_VAR] = previous;
      }
    }
  });
});
