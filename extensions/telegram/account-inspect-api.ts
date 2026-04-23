import type { LittleBabyConfig } from "./runtime-api.js";
import { inspectTelegramAccount } from "./src/account-inspect.js";

export function inspectTelegramReadOnlyAccount(cfg: LittleBabyConfig, accountId?: string | null) {
  return inspectTelegramAccount({ cfg, accountId });
}
