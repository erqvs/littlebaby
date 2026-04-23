import type { ChannelDoctorConfigMutation } from "littlebaby/plugin-sdk/channel-contract";
import type { LittleBabyConfig } from "littlebaby/plugin-sdk/config-runtime";
import { normalizeCompatibilityConfig as normalizeCompatibilityConfigImpl } from "./doctor.js";

export function normalizeCompatibilityConfig({
  cfg,
}: {
  cfg: LittleBabyConfig;
}): ChannelDoctorConfigMutation {
  return normalizeCompatibilityConfigImpl({ cfg });
}
