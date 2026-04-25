import type { IncomingMessage, ServerResponse } from "node:http";
import type { GatewayHttpChatCompletionsConfig } from "../config/types.gateway.js";
import type { AuthRateLimiter } from "./auth-rate-limit.js";
import type { ResolvedGatewayAuth } from "./auth.js";
import { sendJson } from "./http-common.js";

type OpenResponsesHttpOptions = {
  auth: ResolvedGatewayAuth;
  config?: GatewayHttpChatCompletionsConfig;
  maxBodyBytes?: number;
  trustedProxies?: string[];
  allowRealIpFallback?: boolean;
  rateLimiter?: AuthRateLimiter;
};

export async function handleOpenResponsesHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options: OpenResponsesHttpOptions,
): Promise<boolean> {
  void req;
  void options;
  sendJson(res, 404, {
    error: {
      message: "Responses endpoint is not included in this minimal build.",
      type: "not_found",
    },
  });
  return true;
}
