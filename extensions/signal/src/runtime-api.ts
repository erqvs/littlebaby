// Private runtime barrel for the bundled Signal extension.
// Prefer narrower SDK subpaths plus local extension seams over the legacy signal barrel.

export type { ChannelMessageActionAdapter } from "littlebaby/plugin-sdk/channel-contract";
export { buildChannelConfigSchema, SignalConfigSchema } from "../config-api.js";
export { PAIRING_APPROVED_MESSAGE } from "littlebaby/plugin-sdk/channel-status";
import type { LittleBabyConfig as RuntimeLittleBabyConfig } from "littlebaby/plugin-sdk/config-runtime";
export type { RuntimeLittleBabyConfig as LittleBabyConfig };
export type { LittleBabyPluginApi, PluginRuntime } from "littlebaby/plugin-sdk/core";
export type { ChannelPlugin } from "littlebaby/plugin-sdk/core";
export {
  DEFAULT_ACCOUNT_ID,
  applyAccountNameToChannelSection,
  deleteAccountFromConfigSection,
  emptyPluginConfigSchema,
  formatPairingApproveHint,
  getChatChannelMeta,
  migrateBaseNameToDefaultAccount,
  normalizeAccountId,
  setAccountEnabledInConfigSection,
} from "littlebaby/plugin-sdk/core";
export { resolveChannelMediaMaxBytes } from "littlebaby/plugin-sdk/media-runtime";
export { formatCliCommand, formatDocsLink } from "littlebaby/plugin-sdk/setup-tools";
export { chunkText } from "littlebaby/plugin-sdk/reply-runtime";
export { detectBinary } from "littlebaby/plugin-sdk/setup-tools";
export {
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
} from "littlebaby/plugin-sdk/config-runtime";
export {
  buildBaseAccountStatusSnapshot,
  buildBaseChannelStatusSummary,
  collectStatusIssuesFromLastError,
  createDefaultChannelRuntimeState,
} from "littlebaby/plugin-sdk/status-helpers";
export { normalizeE164 } from "littlebaby/plugin-sdk/text-runtime";
export { looksLikeSignalTargetId, normalizeSignalMessagingTarget } from "./normalize.js";
export {
  listEnabledSignalAccounts,
  listSignalAccountIds,
  resolveDefaultSignalAccountId,
  resolveSignalAccount,
} from "./accounts.js";
export { monitorSignalProvider } from "./monitor.js";
export { installSignalCli } from "./install-signal-cli.js";
export { probeSignal } from "./probe.js";
export { resolveSignalReactionLevel } from "./reaction-level.js";
export { removeReactionSignal, sendReactionSignal } from "./send-reactions.js";
export { sendMessageSignal } from "./send.js";
export { signalMessageActions } from "./message-actions.js";
export type { ResolvedSignalAccount } from "./accounts.js";
export type { SignalAccountConfig } from "./account-types.js";
