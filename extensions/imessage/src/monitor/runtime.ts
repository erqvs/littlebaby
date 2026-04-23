import { createNonExitingRuntime, type RuntimeEnv } from "littlebaby/plugin-sdk/runtime-env";
import { normalizeStringEntries } from "littlebaby/plugin-sdk/text-runtime";
import type { MonitorIMessageOpts } from "./types.js";

export function resolveRuntime(opts: MonitorIMessageOpts): RuntimeEnv {
  return opts.runtime ?? createNonExitingRuntime();
}

export function normalizeAllowList(list?: Array<string | number>) {
  return normalizeStringEntries(list);
}
