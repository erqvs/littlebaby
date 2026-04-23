import { formatTrimmedAllowFromEntries } from "littlebaby/plugin-sdk/channel-config-helpers";
import type { ChannelStatusIssue } from "littlebaby/plugin-sdk/channel-contract";
import { PAIRING_APPROVED_MESSAGE } from "littlebaby/plugin-sdk/channel-status";
import {
  DEFAULT_ACCOUNT_ID,
  getChatChannelMeta,
  type ChannelPlugin,
  type LittleBabyConfig,
} from "littlebaby/plugin-sdk/core";
import { resolveChannelMediaMaxBytes } from "littlebaby/plugin-sdk/media-runtime";
import { collectStatusIssuesFromLastError } from "littlebaby/plugin-sdk/status-helpers";
import {
  resolveIMessageConfigAllowFrom,
  resolveIMessageConfigDefaultTo,
} from "./config-accessors.js";
import { looksLikeIMessageTargetId, normalizeIMessageMessagingTarget } from "./normalize.js";
export { chunkTextForOutbound } from "littlebaby/plugin-sdk/text-chunking";

export {
  collectStatusIssuesFromLastError,
  DEFAULT_ACCOUNT_ID,
  formatTrimmedAllowFromEntries,
  getChatChannelMeta,
  looksLikeIMessageTargetId,
  normalizeIMessageMessagingTarget,
  PAIRING_APPROVED_MESSAGE,
  resolveChannelMediaMaxBytes,
  resolveIMessageConfigAllowFrom,
  resolveIMessageConfigDefaultTo,
};

export type { ChannelPlugin, ChannelStatusIssue, LittleBabyConfig };
