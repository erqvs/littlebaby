import type { LittleBabyConfig } from "littlebaby/plugin-sdk/config-runtime";
import { inspectDiscordAccount } from "./src/account-inspect.js";

export function inspectDiscordReadOnlyAccount(cfg: LittleBabyConfig, accountId?: string | null) {
  return inspectDiscordAccount({ cfg, accountId });
}
