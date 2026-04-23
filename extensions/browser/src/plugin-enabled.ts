import type { LittleBabyConfig } from "littlebaby/plugin-sdk/browser-config-runtime";
import {
  normalizePluginsConfig,
  resolveEffectiveEnableState,
} from "littlebaby/plugin-sdk/browser-config-runtime";

export function isDefaultBrowserPluginEnabled(cfg: LittleBabyConfig): boolean {
  return resolveEffectiveEnableState({
    id: "browser",
    origin: "bundled",
    config: normalizePluginsConfig(cfg.plugins),
    rootConfig: cfg,
    enabledByDefault: true,
  }).enabled;
}
