import { createLegacyPrivateNetworkDoctorContract } from "littlebaby/plugin-sdk/ssrf-runtime";

const contract = createLegacyPrivateNetworkDoctorContract({
  channelKey: "nextcloud-talk",
});

export const legacyConfigRules = contract.legacyConfigRules;

export const normalizeCompatibilityConfig = contract.normalizeCompatibilityConfig;
