import { normalizeChatChannelId } from "../channels/ids.js";
import type { LittleBabyConfig } from "../config/types.littlebaby.js";

export function setPluginEnabledInConfig(
  config: LittleBabyConfig,
  pluginId: string,
  enabled: boolean,
): LittleBabyConfig {
  const builtInChannelId = normalizeChatChannelId(pluginId);
  const resolvedId = builtInChannelId ?? pluginId;

  const next: LittleBabyConfig = {
    ...config,
    plugins: {
      ...config.plugins,
      entries: {
        ...config.plugins?.entries,
        [resolvedId]: {
          ...(config.plugins?.entries?.[resolvedId] as object | undefined),
          enabled,
        },
      },
    },
  };

  if (!builtInChannelId) {
    return next;
  }

  const channels = config.channels as Record<string, unknown> | undefined;
  const existing = channels?.[builtInChannelId];
  const existingRecord =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};

  return {
    ...next,
    channels: {
      ...config.channels,
      [builtInChannelId]: {
        ...existingRecord,
        enabled,
      },
    },
  };
}
