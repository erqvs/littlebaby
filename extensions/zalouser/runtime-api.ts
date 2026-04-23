// Private runtime barrel for the bundled Zalo Personal extension.
// Keep this barrel thin and aligned with the local extension surface.

export * from "./api.js";
export { setZalouserRuntime } from "./src/runtime.js";
export type { ReplyPayload } from "littlebaby/plugin-sdk/reply-runtime";
export type {
  BaseProbeResult,
  ChannelAccountSnapshot,
  ChannelDirectoryEntry,
  ChannelGroupContext,
  ChannelMessageActionAdapter,
  ChannelStatusIssue,
} from "littlebaby/plugin-sdk/channel-contract";
export type {
  LittleBabyConfig,
  GroupToolPolicyConfig,
  MarkdownTableMode,
} from "littlebaby/plugin-sdk/config-runtime";
export type {
  PluginRuntime,
  AnyAgentTool,
  ChannelPlugin,
  LittleBabyPluginToolContext,
} from "littlebaby/plugin-sdk/core";
export type { RuntimeEnv } from "littlebaby/plugin-sdk/runtime";
export {
  DEFAULT_ACCOUNT_ID,
  buildChannelConfigSchema,
  normalizeAccountId,
} from "littlebaby/plugin-sdk/core";
export { chunkTextForOutbound } from "littlebaby/plugin-sdk/text-chunking";
export {
  isDangerousNameMatchingEnabled,
  resolveDefaultGroupPolicy,
  resolveOpenProviderRuntimeGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "littlebaby/plugin-sdk/config-runtime";
export {
  mergeAllowlist,
  summarizeMapping,
  formatAllowFromLowercase,
} from "littlebaby/plugin-sdk/allow-from";
export { resolveInboundMentionDecision } from "littlebaby/plugin-sdk/channel-inbound";
export { createChannelPairingController } from "littlebaby/plugin-sdk/channel-pairing";
export { createChannelReplyPipeline } from "littlebaby/plugin-sdk/channel-reply-pipeline";
export { buildBaseAccountStatusSnapshot } from "littlebaby/plugin-sdk/status-helpers";
export { resolveSenderCommandAuthorization } from "littlebaby/plugin-sdk/command-auth";
export {
  evaluateGroupRouteAccessForPolicy,
  resolveSenderScopedGroupPolicy,
} from "littlebaby/plugin-sdk/group-access";
export { loadOutboundMediaFromUrl } from "littlebaby/plugin-sdk/outbound-media";
export {
  deliverTextOrMediaReply,
  isNumericTargetId,
  resolveSendableOutboundReplyParts,
  sendPayloadWithChunkedTextAndMedia,
  type OutboundReplyPayload,
} from "littlebaby/plugin-sdk/reply-payload";
export { resolvePreferredLittleBabyTmpDir } from "littlebaby/plugin-sdk/browser-security-runtime";
