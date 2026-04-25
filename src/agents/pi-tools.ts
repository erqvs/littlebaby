import type { LittleBabyConfig } from "../config/types.littlebaby.js";
import type { ToolLoopDetectionConfig } from "../config/types.tools.js";
import { resolveGatewayMessageChannel } from "../utils/message-channel.js";
import { resolveAgentConfig } from "./agent-scope.js";
import { createLittleBabyTools } from "./littlebaby-tools.js";
import type { AnyAgentTool } from "./pi-tools.types.js";

export function resolveToolLoopDetectionConfig(params: {
  cfg?: LittleBabyConfig;
  agentId?: string;
}): ToolLoopDetectionConfig | undefined {
  const global = params.cfg?.tools?.loopDetection;
  const agent =
    params.agentId && params.cfg
      ? resolveAgentConfig(params.cfg, params.agentId)?.tools?.loopDetection
      : undefined;

  if (!agent) {
    return global;
  }
  if (!global) {
    return agent;
  }

  return {
    ...global,
    ...agent,
    detectors: {
      ...global.detectors,
      ...agent.detectors,
    },
  };
}

export const __testing = {};

export function createLittleBabyCodingTools(
  options?: {
    config?: LittleBabyConfig;
    sessionKey?: string;
    messageProvider?: string;
    agentAccountId?: string;
    messageTo?: string;
    messageThreadId?: string | number;
    currentChannelId?: string;
    currentThreadTs?: string;
    currentMessageId?: string | number;
    replyToMode?: "off" | "first" | "all" | "batched";
    hasRepliedRef?: { value: boolean };
    sandbox?: { enabled?: boolean; workspaceDir?: string };
    disableMessageTool?: boolean;
    requireExplicitMessageTarget?: boolean;
    senderId?: string | null;
    senderIsOwner?: boolean;
    sessionId?: string;
    allowGatewaySubagentBinding?: boolean;
    pluginToolAllowlist?: string[];
  } & Record<string, unknown>,
): AnyAgentTool[] {
  const sandboxRoot =
    options?.sandbox && options.sandbox.enabled === true ? options.sandbox.workspaceDir : undefined;
  return createLittleBabyTools({
    agentSessionKey: options?.sessionKey,
    agentChannel: resolveGatewayMessageChannel(options?.messageProvider),
    agentAccountId: options?.agentAccountId,
    agentTo: options?.messageTo,
    agentThreadId: options?.messageThreadId,
    currentChannelId: options?.currentChannelId,
    currentThreadTs: options?.currentThreadTs,
    currentMessageId: options?.currentMessageId,
    replyToMode: options?.replyToMode,
    hasRepliedRef: options?.hasRepliedRef,
    sandboxRoot,
    config: options?.config,
    pluginToolAllowlist: options?.pluginToolAllowlist,
    requireExplicitMessageTarget: options?.requireExplicitMessageTarget,
    disableMessageTool: options?.disableMessageTool,
    requesterSenderId: options?.senderId,
    senderIsOwner: options?.senderIsOwner,
    sessionId: options?.sessionId,
    allowGatewaySubagentBinding: options?.allowGatewaySubagentBinding,
  });
}
