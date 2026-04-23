import { createConfigIO, getRuntimeConfigSnapshot, type LittleBabyConfig } from "../config/config.js";

export function loadBrowserConfigForRuntimeRefresh(): LittleBabyConfig {
  return getRuntimeConfigSnapshot() ?? createConfigIO().loadConfig();
}
