// Narrow Matrix monitor helper seam.
// Keep monitor internals off the broad package runtime-api barrel so monitor
// tests and shared workers do not pull unrelated Matrix helper surfaces.

export type { NormalizedLocation } from "littlebaby/plugin-sdk/channel-location";
export type { PluginRuntime, RuntimeLogger } from "littlebaby/plugin-sdk/plugin-runtime";
export type { BlockReplyContext, ReplyPayload } from "littlebaby/plugin-sdk/reply-runtime";
export type { MarkdownTableMode, LittleBabyConfig } from "littlebaby/plugin-sdk/config-runtime";
export type { RuntimeEnv } from "littlebaby/plugin-sdk/runtime";
export {
  addAllowlistUserEntriesFromConfigEntry,
  buildAllowlistResolutionSummary,
  canonicalizeAllowlistWithResolvedIds,
  formatAllowlistMatchMeta,
  patchAllowlistUsersInConfigEntries,
  summarizeMapping,
} from "littlebaby/plugin-sdk/allow-from";
export {
  createReplyPrefixOptions,
  createTypingCallbacks,
} from "littlebaby/plugin-sdk/channel-reply-options-runtime";
export { formatLocationText, toLocationContext } from "littlebaby/plugin-sdk/channel-location";
export { getAgentScopedMediaLocalRoots } from "littlebaby/plugin-sdk/agent-media-payload";
export { logInboundDrop, logTypingFailure } from "littlebaby/plugin-sdk/channel-logging";
export { resolveAckReaction } from "littlebaby/plugin-sdk/channel-feedback";
export {
  buildChannelKeyCandidates,
  resolveChannelEntryMatch,
} from "littlebaby/plugin-sdk/channel-targets";
