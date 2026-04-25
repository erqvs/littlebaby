import type { IncomingMessage, ServerResponse } from "node:http";
import type { AuthRateLimiter } from "./auth-rate-limit.js";
import type { ResolvedGatewayAuth } from "./auth.js";
import { sendJson } from "./http-common.js";

type OpenAiEmbeddingsHttpOptions = {
  auth: ResolvedGatewayAuth;
  maxBodyBytes?: number;
  trustedProxies?: string[];
  allowRealIpFallback?: boolean;
  rateLimiter?: AuthRateLimiter;
};

export async function handleOpenAiEmbeddingsHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options: OpenAiEmbeddingsHttpOptions,
): Promise<boolean> {
  void req;
  void options;
  sendJson(res, 404, {
    error: {
      message: "Embeddings endpoint is not included in this minimal build.",
      type: "not_found",
    },
  });
  return true;
}
