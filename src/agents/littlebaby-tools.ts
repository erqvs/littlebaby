import type { LittleBabyConfig } from "../config/types.littlebaby.js";
import type { GatewayMessageChannel } from "../utils/message-channel.js";
import { resolveLittleBabyPluginToolsForOptions } from "./littlebaby-plugin-tools.js";
import type { SandboxFsBridge } from "./sandbox/fs-bridge.js";
import type { SpawnedToolContext } from "./spawned-context.js";
import type { ToolFsPolicy } from "./tool-fs-policy.js";
import type { AnyAgentTool } from "./tools/common.js";
import { createMessageTool } from "./tools/message-tool.js";

type LittleBabyToolsDeps = {
  config?: LittleBabyConfig;
};

const defaultLittleBabyToolsDeps: LittleBabyToolsDeps = {};

let littleBabyToolsDeps: LittleBabyToolsDeps = defaultLittleBabyToolsDeps;

type MinimalLittleBabyToolsOptions = {
  agentSessionKey?: string;
  agentChannel?: GatewayMessageChannel;
  agentAccountId?: string;
  agentTo?: string;
  agentThreadId?: string | number;
  currentChannelId?: string;
  currentThreadTs?: string;
  currentMessageId?: string | number;
  replyToMode?: "off" | "first" | "all" | "batched";
  hasRepliedRef?: { value: boolean };
  sandboxRoot?: string;
  sandboxFsBridge?: SandboxFsBridge;
  fsPolicy?: ToolFsPolicy;
  sandboxed?: boolean;
  config?: LittleBabyConfig;
  pluginToolAllowlist?: string[];
  requireExplicitMessageTarget?: boolean;
  disableMessageTool?: boolean;
  disablePluginTools?: boolean;
  requesterSenderId?: string | null;
  senderIsOwner?: boolean;
  sessionId?: string;
  allowGatewaySubagentBinding?: boolean;
} & SpawnedToolContext &
  Record<string, unknown>;

export function createLittleBabyTools(options?: MinimalLittleBabyToolsOptions): AnyAgentTool[] {
  const resolvedConfig = options?.config ?? littleBabyToolsDeps.config;
  const messageTool = options?.disableMessageTool
    ? null
    : createMessageTool({
        agentAccountId: options?.agentAccountId,
        agentSessionKey: options?.agentSessionKey,
        sessionId: options?.sessionId,
        config: options?.config,
        currentChannelId: options?.currentChannelId,
        currentChannelProvider: options?.agentChannel,
        currentThreadTs: options?.currentThreadTs,
        currentMessageId: options?.currentMessageId,
        replyToMode: options?.replyToMode,
        hasRepliedRef: options?.hasRepliedRef,
        sandboxRoot: options?.sandboxRoot,
        requireExplicitTarget: options?.requireExplicitMessageTarget,
        requesterSenderId: options?.requesterSenderId ?? undefined,
        senderIsOwner: options?.senderIsOwner,
      });
  const tools: AnyAgentTool[] = messageTool ? [messageTool] : [];

  if (options?.disablePluginTools) {
    return tools;
  }

  const wrappedPluginTools = resolveLittleBabyPluginToolsForOptions({
    options,
    resolvedConfig,
    existingToolNames: new Set(tools.map((tool) => tool.name)),
  });

  return [...tools, ...wrappedPluginTools];
}

export const __testing = {
  setDepsForTest(overrides?: Partial<LittleBabyToolsDeps>) {
    littleBabyToolsDeps = overrides
      ? {
          ...defaultLittleBabyToolsDeps,
          ...overrides,
        }
      : defaultLittleBabyToolsDeps;
  },
};
