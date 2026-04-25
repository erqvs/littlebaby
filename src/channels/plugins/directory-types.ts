import type { LittleBabyConfig } from "../../config/types.js";

export type DirectoryConfigParams = {
  cfg: LittleBabyConfig;
  accountId?: string | null;
  query?: string | null;
  limit?: number | null;
};
