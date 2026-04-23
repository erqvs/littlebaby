import type { LittleBabyConfig } from "../../config/types.littlebaby.js";

export function makeModelFallbackCfg(overrides: Partial<LittleBabyConfig> = {}): LittleBabyConfig {
  return {
    agents: {
      defaults: {
        model: {
          primary: "openai/gpt-4.1-mini",
          fallbacks: ["anthropic/claude-haiku-3-5"],
        },
      },
    },
    ...overrides,
  } as LittleBabyConfig;
}
