import { resolveStateDir } from "../../config/paths.js";
import { isVoiceCompatibleAudio } from "../../media/audio.js";
import { mediaKindFromMime } from "../../media/constants.js";
import { detectMime } from "../../media/mime.js";
import { RequestScopedSubagentRuntimeError } from "../../plugin-sdk/error-runtime.js";
import { resolveGlobalSingleton } from "../../shared/global-singleton.js";
import { VERSION } from "../../version.js";
import { createRuntimeAgent } from "./runtime-agent.js";
import { defineCachedValue } from "./runtime-cache.js";
import { createRuntimeChannel } from "./runtime-channel.js";
import { createRuntimeConfig } from "./runtime-config.js";
import { createRuntimeEvents } from "./runtime-events.js";
import { createRuntimeLogging } from "./runtime-logging.js";
import { createRuntimeSystem } from "./runtime-system.js";
import { createRuntimeTaskFlow } from "./runtime-taskflow.js";
import { createRuntimeTasks } from "./runtime-tasks.js";
import type { CreatePluginRuntimeOptions, PluginRuntime } from "./types.js";

export type { CreatePluginRuntimeOptions } from "./types.js";

function createRuntimeTts(): PluginRuntime["tts"] {
  const unavailable = () => {
    throw new Error("TTS runtime is not included in this minimal build.");
  };
  return {
    textToSpeech: unavailable,
    textToSpeechTelephony: unavailable,
    listVoices: unavailable,
  };
}

function createRuntimeMediaUnderstandingFacade(): PluginRuntime["mediaUnderstanding"] {
  const unavailable = () => {
    throw new Error("Media understanding runtime is not included in this minimal build.");
  };
  return {
    runFile: unavailable,
    describeImageFile: unavailable,
    describeImageFileWithModel: unavailable,
    describeVideoFile: unavailable,
    transcribeAudioFile: unavailable,
  };
}

function createRuntimeImageGeneration(): PluginRuntime["imageGeneration"] {
  const unavailable = async () => {
    throw new Error("Image generation runtime is not included in this minimal build.");
  };
  return {
    generate: unavailable,
    listProviders: async () => [],
  };
}

function createRuntimeVideoGeneration(): PluginRuntime["videoGeneration"] {
  const unavailable = async () => {
    throw new Error("Video generation runtime is not included in this minimal build.");
  };
  return {
    generate: unavailable,
    listProviders: async () => [],
  };
}

function createRuntimeMusicGeneration(): PluginRuntime["musicGeneration"] {
  const unavailable = async () => {
    throw new Error("Music generation runtime is not included in this minimal build.");
  };
  return {
    generate: unavailable,
    listProviders: async () => [],
  };
}

function createRuntimeModelAuth(): PluginRuntime["modelAuth"] {
  const unavailable = async () => undefined;
  return {
    getApiKeyForModel: unavailable,
    getRuntimeAuthForModel: unavailable,
    resolveApiKeyForProvider: unavailable,
  };
}

function createRuntimeMedia(): PluginRuntime["media"] {
  return {
    loadWebMedia: async () => {
      throw new Error("Web media loading is not included in this minimal build.");
    },
    detectMime,
    mediaKindFromMime,
    isVoiceCompatibleAudio,
    getImageMetadata: async () => null,
    resizeToJpeg: async () => {
      throw new Error("Image resizing is not included in this minimal build.");
    },
  };
}

function createUnavailableSubagentRuntime(): PluginRuntime["subagent"] {
  const unavailable = () => {
    throw new RequestScopedSubagentRuntimeError();
  };
  return {
    run: unavailable,
    waitForRun: unavailable,
    getSessionMessages: unavailable,
    getSession: unavailable,
    deleteSession: unavailable,
  };
}

// ── Process-global gateway subagent runtime ─────────────────────────
// The gateway creates a real subagent runtime during startup, but gateway-owned
// plugin registries may be loaded (and cached) before the gateway path runs.
// A process-global holder lets explicitly gateway-bindable runtimes resolve the
// active gateway subagent dynamically without changing the default behavior for
// ordinary plugin runtimes.

const GATEWAY_SUBAGENT_SYMBOL: unique symbol = Symbol.for(
  "littlebaby.plugin.gatewaySubagentRuntime",
) as unknown as typeof GATEWAY_SUBAGENT_SYMBOL;

type GatewaySubagentState = {
  subagent: PluginRuntime["subagent"] | undefined;
};

const gatewaySubagentState = resolveGlobalSingleton<GatewaySubagentState>(
  GATEWAY_SUBAGENT_SYMBOL,
  () => ({
    subagent: undefined,
  }),
);

/**
 * Set the process-global gateway subagent runtime.
 * Called during gateway startup so that gateway-bindable plugin runtimes can
 * resolve subagent methods dynamically even when their registry was cached
 * before the gateway finished loading plugins.
 */
export function setGatewaySubagentRuntime(subagent: PluginRuntime["subagent"]): void {
  gatewaySubagentState.subagent = subagent;
}

/**
 * Reset the process-global gateway subagent runtime.
 * Used by tests to avoid leaking gateway state across module reloads.
 */
export function clearGatewaySubagentRuntime(): void {
  gatewaySubagentState.subagent = undefined;
}

/**
 * Create a late-binding subagent that resolves to:
 * 1. An explicitly provided subagent (from runtimeOptions), OR
 * 2. The process-global gateway subagent when the caller explicitly opts in, OR
 * 3. The unavailable fallback (throws with a clear error message).
 */
function createLateBindingSubagent(
  explicit?: PluginRuntime["subagent"],
  allowGatewaySubagentBinding = false,
): PluginRuntime["subagent"] {
  if (explicit) {
    return explicit;
  }

  const unavailable = createUnavailableSubagentRuntime();
  if (!allowGatewaySubagentBinding) {
    return unavailable;
  }

  return new Proxy(unavailable, {
    get(_target, prop, _receiver) {
      const resolved = gatewaySubagentState.subagent ?? unavailable;
      return Reflect.get(resolved, prop, resolved);
    },
  });
}

export function createPluginRuntime(_options: CreatePluginRuntimeOptions = {}): PluginRuntime {
  const mediaUnderstanding = createRuntimeMediaUnderstandingFacade();
  const taskFlow = createRuntimeTaskFlow();
  const tasks = createRuntimeTasks({
    legacyTaskFlow: taskFlow,
  });
  const runtime = {
    // Sourced from the shared LittleBaby version resolver (#52899) so plugins
    // always see the same version the CLI reports, avoiding API-version drift.
    version: VERSION,
    config: createRuntimeConfig(),
    agent: createRuntimeAgent(),
    subagent: createLateBindingSubagent(
      _options.subagent,
      _options.allowGatewaySubagentBinding === true,
    ),
    system: createRuntimeSystem(),
    media: createRuntimeMedia(),
    webSearch: {
      listProviders: () => [],
      search: async () => ({ results: [] }),
    },
    channel: createRuntimeChannel(),
    events: createRuntimeEvents(),
    logging: createRuntimeLogging(),
    state: { resolveStateDir },
    tasks,
    taskFlow,
  } satisfies Omit<
    PluginRuntime,
    | "tts"
    | "mediaUnderstanding"
    | "stt"
    | "modelAuth"
    | "imageGeneration"
    | "videoGeneration"
    | "musicGeneration"
  > &
    Partial<
      Pick<
        PluginRuntime,
        | "tts"
        | "mediaUnderstanding"
        | "stt"
        | "modelAuth"
        | "imageGeneration"
        | "videoGeneration"
        | "musicGeneration"
      >
    >;

  defineCachedValue(runtime, "tts", createRuntimeTts);
  defineCachedValue(runtime, "mediaUnderstanding", () => mediaUnderstanding);
  defineCachedValue(runtime, "stt", () => ({
    transcribeAudioFile: mediaUnderstanding.transcribeAudioFile,
  }));
  defineCachedValue(runtime, "modelAuth", createRuntimeModelAuth);
  defineCachedValue(runtime, "imageGeneration", createRuntimeImageGeneration);
  defineCachedValue(runtime, "videoGeneration", createRuntimeVideoGeneration);
  defineCachedValue(runtime, "musicGeneration", createRuntimeMusicGeneration);

  return runtime as PluginRuntime;
}

export type { PluginRuntime } from "./types.js";
