// Narrow plugin-sdk surface for the bundled diffs plugin.
// Keep this list additive and scoped to the bundled diffs surface.

export { definePluginEntry } from "./plugin-entry.js";
export type { LittleBabyConfig } from "../config/config.js";
export { resolvePreferredLittleBabyTmpDir } from "../infra/tmp-littlebaby-dir.js";
export type {
  AnyAgentTool,
  LittleBabyPluginApi,
  LittleBabyPluginConfigSchema,
  LittleBabyPluginToolContext,
  PluginLogger,
} from "../plugins/types.js";
