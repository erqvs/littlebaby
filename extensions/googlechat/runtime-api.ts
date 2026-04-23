// Private runtime barrel for the bundled Google Chat extension.
// Keep this barrel thin and avoid broad plugin-sdk surfaces during bootstrap.

export { DEFAULT_ACCOUNT_ID } from "littlebaby/plugin-sdk/account-id";
export {
  createActionGate,
  jsonResult,
  readNumberParam,
  readReactionParams,
  readStringParam,
} from "littlebaby/plugin-sdk/channel-actions";
export { buildChannelConfigSchema } from "littlebaby/plugin-sdk/channel-config-primitives";
export type {
  ChannelMessageActionAdapter,
  ChannelMessageActionName,
  ChannelStatusIssue,
} from "littlebaby/plugin-sdk/channel-contract";
export { missingTargetError } from "littlebaby/plugin-sdk/channel-feedback";
export {
  createAccountStatusSink,
  runPassiveAccountLifecycle,
} from "littlebaby/plugin-sdk/channel-lifecycle";
export { createChannelPairingController } from "littlebaby/plugin-sdk/channel-pairing";
export { createChannelReplyPipeline } from "littlebaby/plugin-sdk/channel-reply-pipeline";
export {
  evaluateGroupRouteAccessForPolicy,
  resolveDmGroupAccessWithLists,
  resolveSenderScopedGroupPolicy,
} from "littlebaby/plugin-sdk/channel-policy";
export { PAIRING_APPROVED_MESSAGE } from "littlebaby/plugin-sdk/channel-status";
export { chunkTextForOutbound } from "littlebaby/plugin-sdk/text-chunking";
export type { LittleBabyConfig } from "littlebaby/plugin-sdk/config-runtime";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  isDangerousNameMatchingEnabled,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "littlebaby/plugin-sdk/config-runtime";
export { fetchRemoteMedia, resolveChannelMediaMaxBytes } from "littlebaby/plugin-sdk/media-runtime";
export { loadOutboundMediaFromUrl } from "littlebaby/plugin-sdk/outbound-media";
export type { PluginRuntime } from "littlebaby/plugin-sdk/runtime-store";
export { fetchWithSsrFGuard } from "littlebaby/plugin-sdk/ssrf-runtime";
export {
  GoogleChatConfigSchema,
  type GoogleChatAccountConfig,
  type GoogleChatConfig,
} from "littlebaby/plugin-sdk/googlechat-runtime-shared";
export { extractToolSend } from "littlebaby/plugin-sdk/tool-send";
export { resolveInboundMentionDecision } from "littlebaby/plugin-sdk/channel-inbound";
export { resolveInboundRouteEnvelopeBuilderWithRuntime } from "littlebaby/plugin-sdk/inbound-envelope";
export { resolveWebhookPath } from "littlebaby/plugin-sdk/webhook-path";
export {
  registerWebhookTargetWithPluginRoute,
  resolveWebhookTargetWithAuthOrReject,
  withResolvedWebhookRequestPipeline,
} from "littlebaby/plugin-sdk/webhook-targets";
export {
  createWebhookInFlightLimiter,
  readJsonWebhookBodyOrReject,
  type WebhookInFlightLimiter,
} from "littlebaby/plugin-sdk/webhook-request-guards";
export { setGoogleChatRuntime } from "./src/runtime.js";
