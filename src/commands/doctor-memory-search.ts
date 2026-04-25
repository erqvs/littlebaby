import type { LittleBabyConfig } from "../config/types.littlebaby.js";
import type { RuntimeEnv } from "../runtime.js";
import type { DoctorOptions, DoctorPrompter } from "./doctor-prompter.js";

export async function noteMemoryRecallHealth(cfg: LittleBabyConfig): Promise<void> {
  void cfg;
}

export async function maybeRepairMemoryRecallHealth(params: {
  runtime: RuntimeEnv;
  prompter: DoctorPrompter;
  options: DoctorOptions;
  cfg: LittleBabyConfig;
  cfgForPersistence?: LittleBabyConfig;
}): Promise<void> {
  void params;
}

export async function noteMemorySearchHealth(
  cfg: LittleBabyConfig,
  agentId?: string,
): Promise<void> {
  void cfg;
  void agentId;
}
