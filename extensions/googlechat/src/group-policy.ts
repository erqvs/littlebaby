import { resolveChannelGroupRequireMention } from "littlebaby/plugin-sdk/channel-policy";
import type { LittleBabyConfig } from "littlebaby/plugin-sdk/core";

type GoogleChatGroupContext = {
  cfg: LittleBabyConfig;
  accountId?: string | null;
  groupId?: string | null;
};

export function resolveGoogleChatGroupRequireMention(params: GoogleChatGroupContext): boolean {
  return resolveChannelGroupRequireMention({
    cfg: params.cfg,
    channel: "googlechat",
    groupId: params.groupId,
    accountId: params.accountId,
  });
}
