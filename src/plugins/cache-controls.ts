import { normalizeOptionalString } from "../shared/string-coerce.js";

export const DEFAULT_PLUGIN_DISCOVERY_CACHE_MS = 1000;
export const DEFAULT_PLUGIN_MANIFEST_CACHE_MS = 1000;

export function shouldUsePluginSnapshotCache(env: NodeJS.ProcessEnv): boolean {
  if (normalizeOptionalString(env.LITTLEBABY_DISABLE_PLUGIN_DISCOVERY_CACHE)) {
    return false;
  }
  if (normalizeOptionalString(env.LITTLEBABY_DISABLE_PLUGIN_MANIFEST_CACHE)) {
    return false;
  }
  const discoveryCacheMs = normalizeOptionalString(env.LITTLEBABY_PLUGIN_DISCOVERY_CACHE_MS);
  if (discoveryCacheMs === "0") {
    return false;
  }
  const manifestCacheMs = normalizeOptionalString(env.LITTLEBABY_PLUGIN_MANIFEST_CACHE_MS);
  if (manifestCacheMs === "0") {
    return false;
  }
  return true;
}

export function resolvePluginCacheMs(rawValue: string | undefined, defaultMs: number): number {
  const raw = normalizeOptionalString(rawValue);
  if (raw === "" || raw === "0") {
    return 0;
  }
  if (!raw) {
    return defaultMs;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return defaultMs;
  }
  return Math.max(0, parsed);
}

export function resolvePluginSnapshotCacheTtlMs(env: NodeJS.ProcessEnv): number {
  const discoveryCacheMs = resolvePluginCacheMs(
    env.LITTLEBABY_PLUGIN_DISCOVERY_CACHE_MS,
    DEFAULT_PLUGIN_DISCOVERY_CACHE_MS,
  );
  const manifestCacheMs = resolvePluginCacheMs(
    env.LITTLEBABY_PLUGIN_MANIFEST_CACHE_MS,
    DEFAULT_PLUGIN_MANIFEST_CACHE_MS,
  );
  return Math.min(discoveryCacheMs, manifestCacheMs);
}

export function buildPluginSnapshotCacheEnvKey(env: NodeJS.ProcessEnv): string {
  return JSON.stringify({
    LITTLEBABY_BUNDLED_PLUGINS_DIR: env.LITTLEBABY_BUNDLED_PLUGINS_DIR ?? "",
    LITTLEBABY_DISABLE_PLUGIN_DISCOVERY_CACHE: env.LITTLEBABY_DISABLE_PLUGIN_DISCOVERY_CACHE ?? "",
    LITTLEBABY_DISABLE_PLUGIN_MANIFEST_CACHE: env.LITTLEBABY_DISABLE_PLUGIN_MANIFEST_CACHE ?? "",
    LITTLEBABY_PLUGIN_DISCOVERY_CACHE_MS: env.LITTLEBABY_PLUGIN_DISCOVERY_CACHE_MS ?? "",
    LITTLEBABY_PLUGIN_MANIFEST_CACHE_MS: env.LITTLEBABY_PLUGIN_MANIFEST_CACHE_MS ?? "",
    LITTLEBABY_HOME: env.LITTLEBABY_HOME ?? "",
    LITTLEBABY_STATE_DIR: env.LITTLEBABY_STATE_DIR ?? "",
    LITTLEBABY_CONFIG_PATH: env.LITTLEBABY_CONFIG_PATH ?? "",
    HOME: env.HOME ?? "",
    USERPROFILE: env.USERPROFILE ?? "",
    VITEST: env.VITEST ?? "",
  });
}
