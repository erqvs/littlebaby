import { readStringOrNumberParam, readStringParam } from "littlebaby/plugin-sdk/channel-actions";
import type { LittleBabyConfig } from "littlebaby/plugin-sdk/config-runtime";

export { resolveReactionMessageId } from "littlebaby/plugin-sdk/channel-actions";
export { handleWhatsAppAction } from "./action-runtime.js";
export { isWhatsAppGroupJid, normalizeWhatsAppTarget } from "./normalize.js";
export { readStringOrNumberParam, readStringParam, type LittleBabyConfig };
