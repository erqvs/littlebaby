import type { LittleBabyConfig } from "littlebaby/plugin-sdk/config-runtime";

export type IMessageAccountConfig = Omit<
  NonNullable<NonNullable<LittleBabyConfig["channels"]>["imessage"]>,
  "accounts" | "defaultAccount"
>;
