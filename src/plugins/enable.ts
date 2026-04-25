import { normalizeChatChannelId } from "../channels/ids.js";
import { ensurePluginAllowlisted } from "../config/plugins-allowlist.js";
import type { LittleBabyConfig } from "../config/types.littlebaby.js";
import { setPluginEnabledInConfig } from "./toggle-config.js";

export type PluginEnableResult = {
  config: LittleBabyConfig;
  enabled: boolean;
  reason?: string;
};

export function enablePluginInConfig(cfg: LittleBabyConfig, pluginId: string): PluginEnableResult {
  const builtInChannelId = normalizeChatChannelId(pluginId);
  const resolvedId = builtInChannelId ?? pluginId;
  if (cfg.plugins?.enabled === false) {
    return { config: cfg, enabled: false, reason: "plugins disabled" };
  }
  if (cfg.plugins?.deny?.includes(pluginId) || cfg.plugins?.deny?.includes(resolvedId)) {
    return { config: cfg, enabled: false, reason: "blocked by denylist" };
  }
  let next = setPluginEnabledInConfig(cfg, resolvedId, true);
  next = ensurePluginAllowlisted(next, resolvedId);
  return { config: next, enabled: true };
}
