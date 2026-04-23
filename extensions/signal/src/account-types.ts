import type { LittleBabyConfig } from "littlebaby/plugin-sdk/config-runtime";

export type SignalAccountConfig = Omit<
  Exclude<NonNullable<LittleBabyConfig["channels"]>["signal"], undefined>,
  "accounts"
>;
