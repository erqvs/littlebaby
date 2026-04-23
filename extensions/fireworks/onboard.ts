import {
  createDefaultModelsPresetAppliers,
  type LittleBabyConfig,
} from "littlebaby/plugin-sdk/provider-onboard";
import {
  buildFireworksCatalogModels,
  buildFireworksProvider,
  FIREWORKS_DEFAULT_MODEL_ID,
} from "./provider-catalog.js";

export const FIREWORKS_DEFAULT_MODEL_REF = `fireworks/${FIREWORKS_DEFAULT_MODEL_ID}`;

const fireworksPresetAppliers = createDefaultModelsPresetAppliers({
  primaryModelRef: FIREWORKS_DEFAULT_MODEL_REF,
  resolveParams: (_cfg: LittleBabyConfig) => {
    const defaultProvider = buildFireworksProvider();
    return {
      providerId: "fireworks",
      api: defaultProvider.api ?? "openai-completions",
      baseUrl: defaultProvider.baseUrl,
      defaultModels: buildFireworksCatalogModels(),
      defaultModelId: FIREWORKS_DEFAULT_MODEL_ID,
      aliases: [{ modelRef: FIREWORKS_DEFAULT_MODEL_REF, alias: "Kimi K2.5 Turbo" }],
    };
  },
});

export function applyFireworksProviderConfig(cfg: LittleBabyConfig): LittleBabyConfig {
  return fireworksPresetAppliers.applyProviderConfig(cfg);
}

export function applyFireworksConfig(cfg: LittleBabyConfig): LittleBabyConfig {
  return fireworksPresetAppliers.applyConfig(cfg);
}
