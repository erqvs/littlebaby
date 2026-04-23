import type { LittleBabyConfig } from "../../config/types.littlebaby.js";

export function createPerSenderSessionConfig(
  overrides: Partial<NonNullable<LittleBabyConfig["session"]>> = {},
): NonNullable<LittleBabyConfig["session"]> {
  return {
    mainKey: "main",
    scope: "per-sender",
    ...overrides,
  };
}
