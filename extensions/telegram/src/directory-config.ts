import { normalizeAccountId } from "littlebaby/plugin-sdk/account-core";
import { mapAllowFromEntries } from "littlebaby/plugin-sdk/channel-config-helpers";
import type { LittleBabyConfig, TelegramAccountConfig } from "littlebaby/plugin-sdk/config-runtime";
import { createResolvedDirectoryEntriesLister } from "littlebaby/plugin-sdk/directory-config-runtime";
import { mergeTelegramAccountConfig } from "./account-config.js";
import { resolveDefaultTelegramAccountSelection } from "./account-selection.js";

type TelegramDirectoryAccount = {
  config: TelegramAccountConfig;
};

function resolveTelegramDirectoryAccount(
  cfg: LittleBabyConfig,
  accountId?: string | null,
): TelegramDirectoryAccount {
  const resolvedAccountId = accountId?.trim()
    ? normalizeAccountId(accountId)
    : resolveDefaultTelegramAccountSelection(cfg).accountId;
  return {
    config: mergeTelegramAccountConfig(cfg, resolvedAccountId),
  };
}

export const listTelegramDirectoryPeersFromConfig =
  createResolvedDirectoryEntriesLister<TelegramDirectoryAccount>({
    kind: "user",
    resolveAccount: (cfg, accountId) => resolveTelegramDirectoryAccount(cfg, accountId),
    resolveSources: (account) => [
      mapAllowFromEntries(account.config.allowFrom),
      Object.keys(account.config.dms ?? {}),
    ],
    normalizeId: (entry) => {
      const trimmed = entry.replace(/^(telegram|tg):/i, "").trim();
      if (!trimmed) {
        return null;
      }
      if (/^-?\d+$/.test(trimmed)) {
        return trimmed;
      }
      return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
    },
  });

export const listTelegramDirectoryGroupsFromConfig =
  createResolvedDirectoryEntriesLister<TelegramDirectoryAccount>({
    kind: "group",
    resolveAccount: (cfg, accountId) => resolveTelegramDirectoryAccount(cfg, accountId),
    resolveSources: (account) => [Object.keys(account.config.groups ?? {})],
    normalizeId: (entry) => entry.trim() || null,
  });
