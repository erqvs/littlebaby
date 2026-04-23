import type { ModelProviderConfig } from "littlebaby/plugin-sdk/provider-model-types";
import {
  applyAnthropicConfigDefaults,
  normalizeAnthropicProviderConfig,
} from "./config-defaults.js";

export function normalizeConfig(params: { provider: string; providerConfig: ModelProviderConfig }) {
  return normalizeAnthropicProviderConfig(params.providerConfig);
}

export function applyConfigDefaults(params: Parameters<typeof applyAnthropicConfigDefaults>[0]) {
  return applyAnthropicConfigDefaults(params);
}
