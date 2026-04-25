import { resolveActiveTalkProviderConfig } from "../../config/talk.js";
import type { LittleBabyConfig } from "../../config/types.js";

export { resolveActiveTalkProviderConfig };

export function getRuntimeConfigSnapshot(): LittleBabyConfig | null {
  return null;
}
