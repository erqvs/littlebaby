#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { resolvePnpmRunner } from "./pnpm-runner.mjs";

const rootDir = process.cwd();
const logLevel = process.env.LITTLEBABY_BUILD_VERBOSE ? "info" : "warn";

for (const dir of ["dist-service", "dist-feishu-check"]) {
  fs.rmSync(path.join(rootDir, dir), { recursive: true, force: true });
}

const runner = resolvePnpmRunner({
  pnpmArgs: [
    "exec",
    "tsdown",
    "src/feishu-service.ts",
    "--out-dir",
    "dist-service",
    "--platform",
    "node",
    "--format",
    "esm",
    "--clean",
    "--config-loader",
    "unrun",
    "--logLevel",
    logLevel,
  ],
  nodeExecPath: process.execPath,
  npmExecPath: process.env.npm_execpath,
  comSpec: process.env.ComSpec,
  platform: process.platform,
});

const result = spawnSync(runner.command, runner.args, {
  stdio: "inherit",
  shell: runner.shell,
  windowsVerbatimArguments: runner.windowsVerbatimArguments,
  env: process.env,
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

process.exit(1);
