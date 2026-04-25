import type { MarkdownTableMode } from "./types.base.js";
import type { LittleBabyConfig } from "./types.littlebaby.js";

export type ResolveMarkdownTableModeParams = {
  cfg?: Partial<LittleBabyConfig>;
  channel?: string | null;
  accountId?: string | null;
};

export type ResolveMarkdownTableMode = (
  params: ResolveMarkdownTableModeParams,
) => MarkdownTableMode;
