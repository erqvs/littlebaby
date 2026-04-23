// Private runtime barrel for the bundled Feishu extension.
// Keep this barrel thin and generic-only.

export type {
  AllowlistMatch,
  AnyAgentTool,
  BaseProbeResult,
  ChannelGroupContext,
  ChannelMessageActionName,
  ChannelMeta,
  ChannelOutboundAdapter,
  ChannelPlugin,
  HistoryEntry,
  LittleBabyConfig,
  LittleBabyPluginApi,
  OutboundIdentity,
  PluginRuntime,
  ReplyPayload,
} from "littlebaby/plugin-sdk/core";
export type { LittleBabyConfig as ClawdbotConfig } from "littlebaby/plugin-sdk/core";
export type { RuntimeEnv } from "littlebaby/plugin-sdk/runtime";
export type { GroupToolPolicyConfig } from "littlebaby/plugin-sdk/config-runtime";
export {
  DEFAULT_ACCOUNT_ID,
  buildChannelConfigSchema,
  createActionGate,
  createDedupeCache,
} from "littlebaby/plugin-sdk/core";
export {
  PAIRING_APPROVED_MESSAGE,
  buildProbeChannelStatusSummary,
  createDefaultChannelRuntimeState,
} from "littlebaby/plugin-sdk/channel-status";
export { buildAgentMediaPayload } from "littlebaby/plugin-sdk/agent-media-payload";
export { createChannelPairingController } from "littlebaby/plugin-sdk/channel-pairing";
export { createReplyPrefixContext } from "littlebaby/plugin-sdk/channel-reply-pipeline";
export {
  evaluateSupplementalContextVisibility,
  filterSupplementalContextItems,
  resolveChannelContextVisibilityMode,
} from "littlebaby/plugin-sdk/config-runtime";
export { loadSessionStore, resolveSessionStoreEntry } from "littlebaby/plugin-sdk/config-runtime";
export { readJsonFileWithFallback } from "littlebaby/plugin-sdk/json-store";
export { createPersistentDedupe } from "littlebaby/plugin-sdk/persistent-dedupe";
export { normalizeAgentId } from "littlebaby/plugin-sdk/routing";
export { chunkTextForOutbound } from "littlebaby/plugin-sdk/text-chunking";
export {
  isRequestBodyLimitError,
  readRequestBodyWithLimit,
  requestBodyErrorToText,
} from "littlebaby/plugin-sdk/webhook-ingress";
export { setFeishuRuntime } from "./src/runtime.js";
