import { describe, expect, it } from "vitest";
import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getCommandPositionalsWithRootOptions,
  getCommandPathWithRootOptions,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  isRootHelpInvocation,
  isRootVersionInvocation,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from "./argv.js";

describe("argv helpers", () => {
  it.each([
    {
      name: "help flag",
      argv: ["node", "littlebaby", "--help"],
      expected: true,
    },
    {
      name: "version flag",
      argv: ["node", "littlebaby", "-V"],
      expected: true,
    },
    {
      name: "normal command",
      argv: ["node", "littlebaby", "status"],
      expected: false,
    },
    {
      name: "root -v alias",
      argv: ["node", "littlebaby", "-v"],
      expected: true,
    },
    {
      name: "root -v alias with profile",
      argv: ["node", "littlebaby", "--profile", "work", "-v"],
      expected: true,
    },
    {
      name: "root -v alias with log-level",
      argv: ["node", "littlebaby", "--log-level", "debug", "-v"],
      expected: true,
    },
    {
      name: "subcommand -v should not be treated as version",
      argv: ["node", "littlebaby", "acp", "-v"],
      expected: false,
    },
    {
      name: "root -v alias with equals profile",
      argv: ["node", "littlebaby", "--profile=work", "-v"],
      expected: true,
    },
    {
      name: "subcommand path after global root flags should not be treated as version",
      argv: ["node", "littlebaby", "--dev", "skills", "list", "-v"],
      expected: false,
    },
  ])("detects help/version flags: $name", ({ argv, expected }) => {
    expect(hasHelpOrVersion(argv)).toBe(expected);
  });

  it.each([
    {
      name: "root --version",
      argv: ["node", "littlebaby", "--version"],
      expected: true,
    },
    {
      name: "root -V",
      argv: ["node", "littlebaby", "-V"],
      expected: true,
    },
    {
      name: "root -v alias with profile",
      argv: ["node", "littlebaby", "--profile", "work", "-v"],
      expected: true,
    },
    {
      name: "subcommand version flag",
      argv: ["node", "littlebaby", "status", "--version"],
      expected: false,
    },
    {
      name: "unknown root flag with version",
      argv: ["node", "littlebaby", "--unknown", "--version"],
      expected: false,
    },
  ])("detects root-only version invocations: $name", ({ argv, expected }) => {
    expect(isRootVersionInvocation(argv)).toBe(expected);
  });

  it.each([
    {
      name: "root --help",
      argv: ["node", "littlebaby", "--help"],
      expected: true,
    },
    {
      name: "root -h",
      argv: ["node", "littlebaby", "-h"],
      expected: true,
    },
    {
      name: "root --help with profile",
      argv: ["node", "littlebaby", "--profile", "work", "--help"],
      expected: true,
    },
    {
      name: "subcommand --help",
      argv: ["node", "littlebaby", "status", "--help"],
      expected: false,
    },
    {
      name: "help before subcommand token",
      argv: ["node", "littlebaby", "--help", "status"],
      expected: false,
    },
    {
      name: "help after -- terminator",
      argv: ["node", "littlebaby", "nodes", "invoke", "--", "device.status", "--help"],
      expected: false,
    },
    {
      name: "unknown root flag before help",
      argv: ["node", "littlebaby", "--unknown", "--help"],
      expected: false,
    },
    {
      name: "unknown root flag after help",
      argv: ["node", "littlebaby", "--help", "--unknown"],
      expected: false,
    },
  ])("detects root-only help invocations: $name", ({ argv, expected }) => {
    expect(isRootHelpInvocation(argv)).toBe(expected);
  });

  it.each([
    {
      name: "single command with trailing flag",
      argv: ["node", "littlebaby", "status", "--json"],
      expected: ["status"],
    },
    {
      name: "two-part command",
      argv: ["node", "littlebaby", "agents", "list"],
      expected: ["agents", "list"],
    },
    {
      name: "terminator cuts parsing",
      argv: ["node", "littlebaby", "status", "--", "ignored"],
      expected: ["status"],
    },
  ])("extracts command path: $name", ({ argv, expected }) => {
    expect(getCommandPath(argv, 2)).toEqual(expected);
  });

  it("extracts command path while skipping known root option values", () => {
    expect(
      getCommandPathWithRootOptions(
        [
          "node",
          "littlebaby",
          "--profile",
          "work",
          "--container",
          "demo",
          "--no-color",
          "config",
          "validate",
        ],
        2,
      ),
    ).toEqual(["config", "validate"]);
  });

  it("extracts routed config get positionals with interleaved root options", () => {
    expect(
      getCommandPositionalsWithRootOptions(
        ["node", "littlebaby", "config", "get", "--log-level", "debug", "update.channel", "--json"],
        {
          commandPath: ["config", "get"],
          booleanFlags: ["--json"],
        },
      ),
    ).toEqual(["update.channel"]);
  });

  it("extracts routed config unset positionals with interleaved root options", () => {
    expect(
      getCommandPositionalsWithRootOptions(
        ["node", "littlebaby", "config", "unset", "--profile", "work", "update.channel"],
        {
          commandPath: ["config", "unset"],
        },
      ),
    ).toEqual(["update.channel"]);
  });

  it("returns null when routed command sees unknown options", () => {
    expect(
      getCommandPositionalsWithRootOptions(
        ["node", "littlebaby", "config", "get", "--mystery", "value", "update.channel"],
        {
          commandPath: ["config", "get"],
          booleanFlags: ["--json"],
        },
      ),
    ).toBeNull();
  });

  it.each([
    {
      name: "returns first command token",
      argv: ["node", "littlebaby", "agents", "list"],
      expected: "agents",
    },
    {
      name: "returns null when no command exists",
      argv: ["node", "littlebaby"],
      expected: null,
    },
    {
      name: "skips known root option values",
      argv: ["node", "littlebaby", "--log-level", "debug", "status"],
      expected: "status",
    },
  ])("returns primary command: $name", ({ argv, expected }) => {
    expect(getPrimaryCommand(argv)).toBe(expected);
  });

  it.each([
    {
      name: "detects flag before terminator",
      argv: ["node", "littlebaby", "status", "--json"],
      flag: "--json",
      expected: true,
    },
    {
      name: "ignores flag after terminator",
      argv: ["node", "littlebaby", "--", "--json"],
      flag: "--json",
      expected: false,
    },
  ])("parses boolean flags: $name", ({ argv, flag, expected }) => {
    expect(hasFlag(argv, flag)).toBe(expected);
  });

  it.each([
    {
      name: "value in next token",
      argv: ["node", "littlebaby", "status", "--timeout", "5000"],
      expected: "5000",
    },
    {
      name: "value in equals form",
      argv: ["node", "littlebaby", "status", "--timeout=2500"],
      expected: "2500",
    },
    {
      name: "missing value",
      argv: ["node", "littlebaby", "status", "--timeout"],
      expected: null,
    },
    {
      name: "next token is another flag",
      argv: ["node", "littlebaby", "status", "--timeout", "--json"],
      expected: null,
    },
    {
      name: "flag appears after terminator",
      argv: ["node", "littlebaby", "--", "--timeout=99"],
      expected: undefined,
    },
  ])("extracts flag values: $name", ({ argv, expected }) => {
    expect(getFlagValue(argv, "--timeout")).toBe(expected);
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "littlebaby", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "littlebaby", "status", "--debug"])).toBe(false);
    expect(getVerboseFlag(["node", "littlebaby", "status", "--debug"], { includeDebug: true })).toBe(
      true,
    );
  });

  it.each([
    {
      name: "missing flag",
      argv: ["node", "littlebaby", "status"],
      expected: undefined,
    },
    {
      name: "missing value",
      argv: ["node", "littlebaby", "status", "--timeout"],
      expected: null,
    },
    {
      name: "valid positive integer",
      argv: ["node", "littlebaby", "status", "--timeout", "5000"],
      expected: 5000,
    },
    {
      name: "invalid integer",
      argv: ["node", "littlebaby", "status", "--timeout", "nope"],
      expected: undefined,
    },
  ])("parses positive integer flag values: $name", ({ argv, expected }) => {
    expect(getPositiveIntFlagValue(argv, "--timeout")).toBe(expected);
  });

  it.each([
    {
      name: "keeps plain node argv",
      rawArgs: ["node", "littlebaby", "status"],
      expected: ["node", "littlebaby", "status"],
    },
    {
      name: "keeps version-suffixed node binary",
      rawArgs: ["node-22", "littlebaby", "status"],
      expected: ["node-22", "littlebaby", "status"],
    },
    {
      name: "keeps windows versioned node exe",
      rawArgs: ["node-22.2.0.exe", "littlebaby", "status"],
      expected: ["node-22.2.0.exe", "littlebaby", "status"],
    },
    {
      name: "keeps dotted node binary",
      rawArgs: ["node-22.2", "littlebaby", "status"],
      expected: ["node-22.2", "littlebaby", "status"],
    },
    {
      name: "keeps dotted node exe",
      rawArgs: ["node-22.2.exe", "littlebaby", "status"],
      expected: ["node-22.2.exe", "littlebaby", "status"],
    },
    {
      name: "keeps absolute versioned node path",
      rawArgs: ["/usr/bin/node-22.2.0", "littlebaby", "status"],
      expected: ["/usr/bin/node-22.2.0", "littlebaby", "status"],
    },
    {
      name: "keeps node24 shorthand",
      rawArgs: ["node24", "littlebaby", "status"],
      expected: ["node24", "littlebaby", "status"],
    },
    {
      name: "keeps absolute node24 shorthand",
      rawArgs: ["/usr/bin/node24", "littlebaby", "status"],
      expected: ["/usr/bin/node24", "littlebaby", "status"],
    },
    {
      name: "keeps windows node24 exe",
      rawArgs: ["node24.exe", "littlebaby", "status"],
      expected: ["node24.exe", "littlebaby", "status"],
    },
    {
      name: "keeps nodejs binary",
      rawArgs: ["nodejs", "littlebaby", "status"],
      expected: ["nodejs", "littlebaby", "status"],
    },
    {
      name: "prefixes fallback when first arg is not a node launcher",
      rawArgs: ["node-dev", "littlebaby", "status"],
      expected: ["node", "littlebaby", "node-dev", "littlebaby", "status"],
    },
    {
      name: "prefixes fallback when raw args start at program name",
      rawArgs: ["littlebaby", "status"],
      expected: ["node", "littlebaby", "status"],
    },
    {
      name: "keeps bun execution argv",
      rawArgs: ["bun", "src/entry.ts", "status"],
      expected: ["bun", "src/entry.ts", "status"],
    },
  ] as const)("builds parse argv from raw args: $name", ({ rawArgs, expected }) => {
    const parsed = buildParseArgv({
      programName: "littlebaby",
      rawArgs: [...rawArgs],
    });
    expect(parsed).toEqual([...expected]);
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "littlebaby",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "littlebaby", "status"]);
  });

  it.each([
    { argv: ["node", "littlebaby", "status"], expected: false },
    { argv: ["node", "littlebaby", "health"], expected: false },
    { argv: ["node", "littlebaby", "sessions"], expected: false },
    { argv: ["node", "littlebaby", "config", "get", "update"], expected: false },
    { argv: ["node", "littlebaby", "config", "unset", "update"], expected: false },
    { argv: ["node", "littlebaby", "models", "list"], expected: false },
    { argv: ["node", "littlebaby", "models", "status"], expected: false },
    { argv: ["node", "littlebaby", "update", "status", "--json"], expected: false },
    { argv: ["node", "littlebaby", "agent", "--message", "hi"], expected: false },
    { argv: ["node", "littlebaby", "agents", "list"], expected: true },
    { argv: ["node", "littlebaby", "message", "send"], expected: true },
  ] as const)("decides when to migrate state: $argv", ({ argv, expected }) => {
    expect(shouldMigrateState([...argv])).toBe(expected);
  });

  it.each([
    { path: ["status"], expected: false },
    { path: ["update", "status"], expected: false },
    { path: ["config", "get"], expected: false },
    { path: ["models", "status"], expected: false },
    { path: ["agents", "list"], expected: true },
  ])("reuses command path for migrate state decisions: $path", ({ path, expected }) => {
    expect(shouldMigrateStateFromPath(path)).toBe(expected);
  });
});
