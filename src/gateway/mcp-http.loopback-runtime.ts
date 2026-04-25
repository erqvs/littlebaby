export type McpLoopbackRuntime = {
  port: number;
  token: string;
};

let activeRuntime: McpLoopbackRuntime | undefined;

export function getActiveMcpLoopbackRuntime(): McpLoopbackRuntime | undefined {
  return activeRuntime ? { ...activeRuntime } : undefined;
}

export function setActiveMcpLoopbackRuntime(runtime: McpLoopbackRuntime): void {
  activeRuntime = { ...runtime };
}

export function clearActiveMcpLoopbackRuntime(token: string): void {
  if (activeRuntime?.token === token) {
    activeRuntime = undefined;
  }
}

export function createMcpLoopbackServerConfig(port: number) {
  return {
    mcpServers: {
      littlebaby: {
        type: "http",
        url: `http://127.0.0.1:${port}/mcp`,
        headers: {
          Authorization: "Bearer ${LITTLEBABY_MCP_TOKEN}",
          "x-session-key": "${LITTLEBABY_MCP_SESSION_KEY}",
          "x-littlebaby-agent-id": "${LITTLEBABY_MCP_AGENT_ID}",
          "x-littlebaby-account-id": "${LITTLEBABY_MCP_ACCOUNT_ID}",
          "x-littlebaby-message-channel": "${LITTLEBABY_MCP_MESSAGE_CHANNEL}",
          "x-littlebaby-sender-is-owner": "${LITTLEBABY_MCP_SENDER_IS_OWNER}",
        },
      },
    },
  };
}
