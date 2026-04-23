// Private runtime barrel for the bundled Mattermost extension.
// Keep this barrel thin and generic-only.

export type {
  BaseProbeResult,
  ChannelAccountSnapshot,
  ChannelDirectoryEntry,
  ChannelGroupContext,
  ChannelMessageActionName,
  ChannelPlugin,
  ChatType,
  HistoryEntry,
  LittleBabyConfig,
  LittleBabyPluginApi,
  PluginRuntime,
} from "littlebaby/plugin-sdk/core";
export type { RuntimeEnv } from "littlebaby/plugin-sdk/runtime";
export type { ReplyPayload } from "littlebaby/plugin-sdk/reply-runtime";
export type { ModelsProviderData } from "littlebaby/plugin-sdk/command-auth";
export type {
  BlockStreamingCoalesceConfig,
  DmPolicy,
  GroupPolicy,
} from "littlebaby/plugin-sdk/config-runtime";
export {
  DEFAULT_ACCOUNT_ID,
  buildChannelConfigSchema,
  createDedupeCache,
  parseStrictPositiveInteger,
  resolveClientIp,
  isTrustedProxyAddress,
} from "littlebaby/plugin-sdk/core";
export { buildComputedAccountStatusSnapshot } from "littlebaby/plugin-sdk/channel-status";
export { createAccountStatusSink } from "littlebaby/plugin-sdk/channel-lifecycle";
export { buildAgentMediaPayload } from "littlebaby/plugin-sdk/agent-media-payload";
export {
  buildModelsProviderData,
  listSkillCommandsForAgents,
  resolveControlCommandGate,
  resolveStoredModelOverride,
} from "littlebaby/plugin-sdk/command-auth";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  isDangerousNameMatchingEnabled,
  loadSessionStore,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  resolveStorePath,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "littlebaby/plugin-sdk/config-runtime";
export { formatInboundFromLabel } from "littlebaby/plugin-sdk/channel-inbound";
export { logInboundDrop } from "littlebaby/plugin-sdk/channel-inbound";
export { createChannelPairingController } from "littlebaby/plugin-sdk/channel-pairing";
export {
  DM_GROUP_ACCESS_REASON,
  readStoreAllowFromForDmPolicy,
  resolveDmGroupAccessWithLists,
  resolveEffectiveAllowFromLists,
} from "littlebaby/plugin-sdk/channel-policy";
export { evaluateSenderGroupAccessForPolicy } from "littlebaby/plugin-sdk/group-access";
export { createChannelReplyPipeline } from "littlebaby/plugin-sdk/channel-reply-pipeline";
export { logTypingFailure } from "littlebaby/plugin-sdk/channel-feedback";
export { loadOutboundMediaFromUrl } from "littlebaby/plugin-sdk/outbound-media";
export { rawDataToString } from "littlebaby/plugin-sdk/browser-node-runtime";
export { chunkTextForOutbound } from "littlebaby/plugin-sdk/text-chunking";
export {
  DEFAULT_GROUP_HISTORY_LIMIT,
  buildPendingHistoryContextFromMap,
  clearHistoryEntriesIfEnabled,
  recordPendingHistoryEntryIfEnabled,
} from "littlebaby/plugin-sdk/reply-history";
export { normalizeAccountId, resolveThreadSessionKeys } from "littlebaby/plugin-sdk/routing";
export { resolveAllowlistMatchSimple } from "littlebaby/plugin-sdk/allow-from";
export { registerPluginHttpRoute } from "littlebaby/plugin-sdk/webhook-targets";
export {
  isRequestBodyLimitError,
  readRequestBodyWithLimit,
} from "littlebaby/plugin-sdk/webhook-ingress";
export {
  applyAccountNameToChannelSection,
  applySetupAccountConfigPatch,
  migrateBaseNameToDefaultAccount,
} from "littlebaby/plugin-sdk/setup";
export {
  getAgentScopedMediaLocalRoots,
  resolveChannelMediaMaxBytes,
} from "littlebaby/plugin-sdk/media-runtime";
export { normalizeProviderId } from "littlebaby/plugin-sdk/provider-model-shared";
export { setMattermostRuntime } from "./src/runtime.js";
