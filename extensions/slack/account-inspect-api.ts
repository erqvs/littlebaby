import type { LittleBabyConfig } from "littlebaby/plugin-sdk/config-runtime";
import { inspectSlackAccount } from "./src/account-inspect.js";

export function inspectSlackReadOnlyAccount(cfg: LittleBabyConfig, accountId?: string | null) {
  return inspectSlackAccount({ cfg, accountId });
}
