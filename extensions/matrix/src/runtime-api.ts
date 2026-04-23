export {
  DEFAULT_ACCOUNT_ID,
  normalizeAccountId,
  normalizeOptionalAccountId,
} from "littlebaby/plugin-sdk/account-id";
export {
  createActionGate,
  jsonResult,
  readNumberParam,
  readReactionParams,
  readStringArrayParam,
  readStringParam,
  ToolAuthorizationError,
} from "littlebaby/plugin-sdk/channel-actions";
export { buildChannelConfigSchema } from "littlebaby/plugin-sdk/channel-config-primitives";
export type { ChannelPlugin } from "littlebaby/plugin-sdk/channel-core";
export type {
  BaseProbeResult,
  ChannelDirectoryEntry,
  ChannelGroupContext,
  ChannelMessageActionAdapter,
  ChannelMessageActionContext,
  ChannelMessageActionName,
  ChannelMessageToolDiscovery,
  ChannelOutboundAdapter,
  ChannelResolveKind,
  ChannelResolveResult,
  ChannelToolSend,
} from "littlebaby/plugin-sdk/channel-contract";
export {
  formatLocationText,
  toLocationContext,
  type NormalizedLocation,
} from "littlebaby/plugin-sdk/channel-location";
export { logInboundDrop, logTypingFailure } from "littlebaby/plugin-sdk/channel-logging";
export { resolveAckReaction } from "littlebaby/plugin-sdk/channel-feedback";
export type { ChannelSetupInput } from "littlebaby/plugin-sdk/setup";
export type {
  LittleBabyConfig,
  ContextVisibilityMode,
  DmPolicy,
  GroupPolicy,
} from "littlebaby/plugin-sdk/config-runtime";
export type { GroupToolPolicyConfig } from "littlebaby/plugin-sdk/config-runtime";
export type { WizardPrompter } from "littlebaby/plugin-sdk/matrix-runtime-shared";
export type { SecretInput } from "littlebaby/plugin-sdk/secret-input";
export {
  GROUP_POLICY_BLOCKED_LABEL,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  warnMissingProviderGroupPolicyFallbackOnce,
} from "littlebaby/plugin-sdk/config-runtime";
export {
  addWildcardAllowFrom,
  formatDocsLink,
  hasConfiguredSecretInput,
  mergeAllowFromEntries,
  moveSingleAccountChannelSectionToDefaultAccount,
  promptAccountId,
  promptChannelAccessConfig,
  splitSetupEntries,
} from "littlebaby/plugin-sdk/setup";
export type { RuntimeEnv } from "littlebaby/plugin-sdk/runtime";
export {
  assertHttpUrlTargetsPrivateNetwork,
  closeDispatcher,
  createPinnedDispatcher,
  isPrivateOrLoopbackHost,
  resolvePinnedHostnameWithPolicy,
  ssrfPolicyFromDangerouslyAllowPrivateNetwork,
  ssrfPolicyFromAllowPrivateNetwork,
  type LookupFn,
  type SsrFPolicy,
} from "littlebaby/plugin-sdk/ssrf-runtime";
export { dispatchReplyFromConfigWithSettledDispatcher } from "littlebaby/plugin-sdk/inbound-reply-dispatch";
export {
  ensureConfiguredAcpBindingReady,
  resolveConfiguredAcpBindingRecord,
} from "littlebaby/plugin-sdk/acp-binding-runtime";
export {
  buildProbeChannelStatusSummary,
  collectStatusIssuesFromLastError,
  PAIRING_APPROVED_MESSAGE,
} from "littlebaby/plugin-sdk/channel-status";
export {
  getSessionBindingService,
  resolveThreadBindingIdleTimeoutMsForChannel,
  resolveThreadBindingMaxAgeMsForChannel,
} from "littlebaby/plugin-sdk/conversation-runtime";
export { resolveOutboundSendDep } from "littlebaby/plugin-sdk/outbound-runtime";
export { resolveAgentIdFromSessionKey } from "littlebaby/plugin-sdk/routing";
export { chunkTextForOutbound } from "littlebaby/plugin-sdk/text-chunking";
export { createChannelReplyPipeline } from "littlebaby/plugin-sdk/channel-reply-pipeline";
export { loadOutboundMediaFromUrl } from "littlebaby/plugin-sdk/outbound-media";
export { normalizePollInput, type PollInput } from "littlebaby/plugin-sdk/poll-runtime";
export { writeJsonFileAtomically } from "littlebaby/plugin-sdk/json-store";
export {
  buildChannelKeyCandidates,
  resolveChannelEntryMatch,
} from "littlebaby/plugin-sdk/channel-targets";
export {
  evaluateGroupRouteAccessForPolicy,
  resolveSenderScopedGroupPolicy,
} from "littlebaby/plugin-sdk/channel-policy";
export {
  formatZonedTimestamp,
  type PluginRuntime,
  type RuntimeLogger,
} from "littlebaby/plugin-sdk/matrix-runtime-shared";
export type { ReplyPayload } from "littlebaby/plugin-sdk/reply-runtime";
// resolveMatrixAccountStringValues already comes from plugin-sdk/matrix.
// Re-exporting auth-precedence here makes Jiti try to define the same export twice.

export function buildTimeoutAbortSignal(params: { timeoutMs?: number; signal?: AbortSignal }): {
  signal?: AbortSignal;
  cleanup: () => void;
} {
  const { timeoutMs, signal } = params;
  if (!timeoutMs && !signal) {
    return { signal: undefined, cleanup: () => {} };
  }
  if (!timeoutMs) {
    return { signal, cleanup: () => {} };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(controller.abort.bind(controller), timeoutMs);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onAbort);
    },
  };
}
