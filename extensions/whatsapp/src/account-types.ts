import type { LittleBabyConfig } from "littlebaby/plugin-sdk/config-runtime";

export type WhatsAppAccountConfig = NonNullable<
  NonNullable<NonNullable<LittleBabyConfig["channels"]>["whatsapp"]>["accounts"]
>[string];
