import type { SessionAcpMeta } from "../../../config/sessions/types.js";
import type { LittleBabyConfig } from "../../../config/types.littlebaby.js";

export function createAcpTestConfig(overrides?: Partial<LittleBabyConfig>): LittleBabyConfig {
  return {
    acp: {
      enabled: true,
      stream: {
        coalesceIdleMs: 0,
        maxChunkChars: 64,
      },
    },
    ...overrides,
  } as LittleBabyConfig;
}

export function createAcpSessionMeta(overrides?: Partial<SessionAcpMeta>): SessionAcpMeta {
  return {
    backend: "acpx",
    agent: "codex",
    runtimeSessionName: "runtime:1",
    mode: "persistent",
    state: "idle",
    lastActivityAt: Date.now(),
    identity: {
      state: "resolved",
      acpxSessionId: "acpx-session-1",
      source: "status",
      lastUpdatedAt: Date.now(),
    },
    ...overrides,
  };
}
