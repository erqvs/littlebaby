import { randomUUID } from "node:crypto";
import type { Agent } from "node:http";
import process from "node:process";
import { HttpsProxyAgent } from "https-proxy-agent";
import {
  resolveDebugProxyBlobDir,
  resolveDebugProxyCertDir,
  resolveDebugProxyDbPath,
} from "./paths.js";

export const LITTLEBABY_DEBUG_PROXY_ENABLED = "LITTLEBABY_DEBUG_PROXY_ENABLED";
export const LITTLEBABY_DEBUG_PROXY_URL = "LITTLEBABY_DEBUG_PROXY_URL";
export const LITTLEBABY_DEBUG_PROXY_DB_PATH = "LITTLEBABY_DEBUG_PROXY_DB_PATH";
export const LITTLEBABY_DEBUG_PROXY_BLOB_DIR = "LITTLEBABY_DEBUG_PROXY_BLOB_DIR";
export const LITTLEBABY_DEBUG_PROXY_CERT_DIR = "LITTLEBABY_DEBUG_PROXY_CERT_DIR";
export const LITTLEBABY_DEBUG_PROXY_SESSION_ID = "LITTLEBABY_DEBUG_PROXY_SESSION_ID";
export const LITTLEBABY_DEBUG_PROXY_REQUIRE = "LITTLEBABY_DEBUG_PROXY_REQUIRE";

export type DebugProxySettings = {
  enabled: boolean;
  required: boolean;
  proxyUrl?: string;
  dbPath: string;
  blobDir: string;
  certDir: string;
  sessionId: string;
  sourceProcess: string;
};

let cachedImplicitSessionId: string | undefined;

function isTruthy(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

export function resolveDebugProxySettings(
  env: NodeJS.ProcessEnv = process.env,
): DebugProxySettings {
  const enabled = isTruthy(env[LITTLEBABY_DEBUG_PROXY_ENABLED]);
  const explicitSessionId = env[LITTLEBABY_DEBUG_PROXY_SESSION_ID]?.trim() || undefined;
  const sessionId = explicitSessionId ?? (cachedImplicitSessionId ??= randomUUID());
  return {
    enabled,
    required: isTruthy(env[LITTLEBABY_DEBUG_PROXY_REQUIRE]),
    proxyUrl: env[LITTLEBABY_DEBUG_PROXY_URL]?.trim() || undefined,
    dbPath: env[LITTLEBABY_DEBUG_PROXY_DB_PATH]?.trim() || resolveDebugProxyDbPath(env),
    blobDir: env[LITTLEBABY_DEBUG_PROXY_BLOB_DIR]?.trim() || resolveDebugProxyBlobDir(env),
    certDir: env[LITTLEBABY_DEBUG_PROXY_CERT_DIR]?.trim() || resolveDebugProxyCertDir(env),
    sessionId,
    sourceProcess: "littlebaby",
  };
}

export function applyDebugProxyEnv(
  env: NodeJS.ProcessEnv,
  params: {
    proxyUrl: string;
    sessionId: string;
    dbPath?: string;
    blobDir?: string;
    certDir?: string;
  },
): NodeJS.ProcessEnv {
  return {
    ...env,
    [LITTLEBABY_DEBUG_PROXY_ENABLED]: "1",
    [LITTLEBABY_DEBUG_PROXY_REQUIRE]: "1",
    [LITTLEBABY_DEBUG_PROXY_URL]: params.proxyUrl,
    [LITTLEBABY_DEBUG_PROXY_DB_PATH]: params.dbPath ?? resolveDebugProxyDbPath(env),
    [LITTLEBABY_DEBUG_PROXY_BLOB_DIR]: params.blobDir ?? resolveDebugProxyBlobDir(env),
    [LITTLEBABY_DEBUG_PROXY_CERT_DIR]: params.certDir ?? resolveDebugProxyCertDir(env),
    [LITTLEBABY_DEBUG_PROXY_SESSION_ID]: params.sessionId,
    HTTP_PROXY: params.proxyUrl,
    HTTPS_PROXY: params.proxyUrl,
    ALL_PROXY: params.proxyUrl,
  };
}

export function createDebugProxyWebSocketAgent(settings: DebugProxySettings): Agent | undefined {
  if (!settings.enabled || !settings.proxyUrl) {
    return undefined;
  }
  return new HttpsProxyAgent(settings.proxyUrl);
}

export function resolveEffectiveDebugProxyUrl(configuredProxyUrl?: string): string | undefined {
  const explicit = configuredProxyUrl?.trim();
  if (explicit) {
    return explicit;
  }
  const settings = resolveDebugProxySettings();
  return settings.enabled ? settings.proxyUrl : undefined;
}
