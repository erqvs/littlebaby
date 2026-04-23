// Private runtime barrel for the bundled IRC extension.
// Keep this barrel thin and generic-only.

export type { BaseProbeResult } from "littlebaby/plugin-sdk/channel-contract";
export type { ChannelPlugin } from "littlebaby/plugin-sdk/channel-core";
export type { LittleBabyConfig } from "littlebaby/plugin-sdk/config-runtime";
export type { PluginRuntime } from "littlebaby/plugin-sdk/runtime-store";
export type { RuntimeEnv } from "littlebaby/plugin-sdk/runtime";
export type {
  BlockStreamingCoalesceConfig,
  DmConfig,
  DmPolicy,
  GroupPolicy,
  GroupToolPolicyBySenderConfig,
  GroupToolPolicyConfig,
  MarkdownConfig,
} from "littlebaby/plugin-sdk/config-runtime";
export type { OutboundReplyPayload } from "littlebaby/plugin-sdk/reply-payload";
export { DEFAULT_ACCOUNT_ID } from "littlebaby/plugin-sdk/account-id";
export { buildChannelConfigSchema } from "littlebaby/plugin-sdk/channel-config-primitives";
export {
  PAIRING_APPROVED_MESSAGE,
  buildBaseChannelStatusSummary,
} from "littlebaby/plugin-sdk/channel-status";
export { createChannelPairingController } from "littlebaby/plugin-sdk/channel-pairing";
export { createAccountStatusSink } from "littlebaby/plugin-sdk/channel-lifecycle";
export {
  readStoreAllowFromForDmPolicy,
  resolveEffectiveAllowFromLists,
} from "littlebaby/plugin-sdk/channel-policy";
export { resolveControlCommandGate } from "littlebaby/plugin-sdk/command-auth";
export { dispatchInboundReplyWithBase } from "littlebaby/plugin-sdk/inbound-reply-dispatch";
export { chunkTextForOutbound } from "littlebaby/plugin-sdk/text-chunking";
export {
  deliverFormattedTextWithAttachments,
  formatTextWithAttachmentLinks,
  resolveOutboundMediaUrls,
} from "littlebaby/plugin-sdk/reply-payload";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  isDangerousNameMatchingEnabled,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "littlebaby/plugin-sdk/config-runtime";
export { logInboundDrop } from "littlebaby/plugin-sdk/channel-inbound";
