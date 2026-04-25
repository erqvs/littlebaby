import type { LittleBabyConfig } from "../config/types.littlebaby.js";

export async function startGatewayMemoryBackend(params: {
  cfg: LittleBabyConfig;
  log: { info?: (msg: string) => void; warn: (msg: string) => void };
}): Promise<void> {
  void params;
}
