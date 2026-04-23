import type { LittleBabyConfig } from "../config/types.littlebaby.js";
import type { PluginRuntime } from "./runtime/types.js";
import type { LittleBabyPluginApi, PluginLogger } from "./types.js";

export type BuildPluginApiParams = {
  id: string;
  name: string;
  version?: string;
  description?: string;
  source: string;
  rootDir?: string;
  registrationMode: LittleBabyPluginApi["registrationMode"];
  config: LittleBabyConfig;
  pluginConfig?: Record<string, unknown>;
  runtime: PluginRuntime;
  logger: PluginLogger;
  resolvePath: (input: string) => string;
  handlers?: Partial<
    Pick<
      LittleBabyPluginApi,
      | "registerTool"
      | "registerHook"
      | "registerHttpRoute"
      | "registerChannel"
      | "registerGatewayMethod"
      | "registerCli"
      | "registerReload"
      | "registerNodeHostCommand"
      | "registerSecurityAuditCollector"
      | "registerService"
      | "registerCliBackend"
      | "registerTextTransforms"
      | "registerConfigMigration"
      | "registerAutoEnableProbe"
      | "registerProvider"
      | "registerSpeechProvider"
      | "registerRealtimeTranscriptionProvider"
      | "registerRealtimeVoiceProvider"
      | "registerMediaUnderstandingProvider"
      | "registerImageGenerationProvider"
      | "registerVideoGenerationProvider"
      | "registerMusicGenerationProvider"
      | "registerWebFetchProvider"
      | "registerWebSearchProvider"
      | "registerInteractiveHandler"
      | "onConversationBindingResolved"
      | "registerCommand"
      | "registerContextEngine"
      | "registerCompactionProvider"
      | "registerAgentHarness"
      | "registerDetachedTaskRuntime"
      | "registerMemoryCapability"
      | "registerMemoryPromptSection"
      | "registerMemoryPromptSupplement"
      | "registerMemoryCorpusSupplement"
      | "registerMemoryFlushPlan"
      | "registerMemoryRuntime"
      | "registerMemoryEmbeddingProvider"
      | "on"
    >
  >;
};

const noopRegisterTool: LittleBabyPluginApi["registerTool"] = () => {};
const noopRegisterHook: LittleBabyPluginApi["registerHook"] = () => {};
const noopRegisterHttpRoute: LittleBabyPluginApi["registerHttpRoute"] = () => {};
const noopRegisterChannel: LittleBabyPluginApi["registerChannel"] = () => {};
const noopRegisterGatewayMethod: LittleBabyPluginApi["registerGatewayMethod"] = () => {};
const noopRegisterCli: LittleBabyPluginApi["registerCli"] = () => {};
const noopRegisterReload: LittleBabyPluginApi["registerReload"] = () => {};
const noopRegisterNodeHostCommand: LittleBabyPluginApi["registerNodeHostCommand"] = () => {};
const noopRegisterSecurityAuditCollector: LittleBabyPluginApi["registerSecurityAuditCollector"] =
  () => {};
const noopRegisterService: LittleBabyPluginApi["registerService"] = () => {};
const noopRegisterCliBackend: LittleBabyPluginApi["registerCliBackend"] = () => {};
const noopRegisterTextTransforms: LittleBabyPluginApi["registerTextTransforms"] = () => {};
const noopRegisterConfigMigration: LittleBabyPluginApi["registerConfigMigration"] = () => {};
const noopRegisterAutoEnableProbe: LittleBabyPluginApi["registerAutoEnableProbe"] = () => {};
const noopRegisterProvider: LittleBabyPluginApi["registerProvider"] = () => {};
const noopRegisterSpeechProvider: LittleBabyPluginApi["registerSpeechProvider"] = () => {};
const noopRegisterRealtimeTranscriptionProvider: LittleBabyPluginApi["registerRealtimeTranscriptionProvider"] =
  () => {};
const noopRegisterRealtimeVoiceProvider: LittleBabyPluginApi["registerRealtimeVoiceProvider"] =
  () => {};
const noopRegisterMediaUnderstandingProvider: LittleBabyPluginApi["registerMediaUnderstandingProvider"] =
  () => {};
const noopRegisterImageGenerationProvider: LittleBabyPluginApi["registerImageGenerationProvider"] =
  () => {};
const noopRegisterVideoGenerationProvider: LittleBabyPluginApi["registerVideoGenerationProvider"] =
  () => {};
const noopRegisterMusicGenerationProvider: LittleBabyPluginApi["registerMusicGenerationProvider"] =
  () => {};
const noopRegisterWebFetchProvider: LittleBabyPluginApi["registerWebFetchProvider"] = () => {};
const noopRegisterWebSearchProvider: LittleBabyPluginApi["registerWebSearchProvider"] = () => {};
const noopRegisterInteractiveHandler: LittleBabyPluginApi["registerInteractiveHandler"] = () => {};
const noopOnConversationBindingResolved: LittleBabyPluginApi["onConversationBindingResolved"] =
  () => {};
const noopRegisterCommand: LittleBabyPluginApi["registerCommand"] = () => {};
const noopRegisterContextEngine: LittleBabyPluginApi["registerContextEngine"] = () => {};
const noopRegisterCompactionProvider: LittleBabyPluginApi["registerCompactionProvider"] = () => {};
const noopRegisterAgentHarness: LittleBabyPluginApi["registerAgentHarness"] = () => {};
const noopRegisterDetachedTaskRuntime: LittleBabyPluginApi["registerDetachedTaskRuntime"] = () => {};
const noopRegisterMemoryCapability: LittleBabyPluginApi["registerMemoryCapability"] = () => {};
const noopRegisterMemoryPromptSection: LittleBabyPluginApi["registerMemoryPromptSection"] = () => {};
const noopRegisterMemoryPromptSupplement: LittleBabyPluginApi["registerMemoryPromptSupplement"] =
  () => {};
const noopRegisterMemoryCorpusSupplement: LittleBabyPluginApi["registerMemoryCorpusSupplement"] =
  () => {};
const noopRegisterMemoryFlushPlan: LittleBabyPluginApi["registerMemoryFlushPlan"] = () => {};
const noopRegisterMemoryRuntime: LittleBabyPluginApi["registerMemoryRuntime"] = () => {};
const noopRegisterMemoryEmbeddingProvider: LittleBabyPluginApi["registerMemoryEmbeddingProvider"] =
  () => {};
const noopOn: LittleBabyPluginApi["on"] = () => {};

export function buildPluginApi(params: BuildPluginApiParams): LittleBabyPluginApi {
  const handlers = params.handlers ?? {};
  return {
    id: params.id,
    name: params.name,
    version: params.version,
    description: params.description,
    source: params.source,
    rootDir: params.rootDir,
    registrationMode: params.registrationMode,
    config: params.config,
    pluginConfig: params.pluginConfig,
    runtime: params.runtime,
    logger: params.logger,
    registerTool: handlers.registerTool ?? noopRegisterTool,
    registerHook: handlers.registerHook ?? noopRegisterHook,
    registerHttpRoute: handlers.registerHttpRoute ?? noopRegisterHttpRoute,
    registerChannel: handlers.registerChannel ?? noopRegisterChannel,
    registerGatewayMethod: handlers.registerGatewayMethod ?? noopRegisterGatewayMethod,
    registerCli: handlers.registerCli ?? noopRegisterCli,
    registerReload: handlers.registerReload ?? noopRegisterReload,
    registerNodeHostCommand: handlers.registerNodeHostCommand ?? noopRegisterNodeHostCommand,
    registerSecurityAuditCollector:
      handlers.registerSecurityAuditCollector ?? noopRegisterSecurityAuditCollector,
    registerService: handlers.registerService ?? noopRegisterService,
    registerCliBackend: handlers.registerCliBackend ?? noopRegisterCliBackend,
    registerTextTransforms: handlers.registerTextTransforms ?? noopRegisterTextTransforms,
    registerConfigMigration: handlers.registerConfigMigration ?? noopRegisterConfigMigration,
    registerAutoEnableProbe: handlers.registerAutoEnableProbe ?? noopRegisterAutoEnableProbe,
    registerProvider: handlers.registerProvider ?? noopRegisterProvider,
    registerSpeechProvider: handlers.registerSpeechProvider ?? noopRegisterSpeechProvider,
    registerRealtimeTranscriptionProvider:
      handlers.registerRealtimeTranscriptionProvider ?? noopRegisterRealtimeTranscriptionProvider,
    registerRealtimeVoiceProvider:
      handlers.registerRealtimeVoiceProvider ?? noopRegisterRealtimeVoiceProvider,
    registerMediaUnderstandingProvider:
      handlers.registerMediaUnderstandingProvider ?? noopRegisterMediaUnderstandingProvider,
    registerImageGenerationProvider:
      handlers.registerImageGenerationProvider ?? noopRegisterImageGenerationProvider,
    registerVideoGenerationProvider:
      handlers.registerVideoGenerationProvider ?? noopRegisterVideoGenerationProvider,
    registerMusicGenerationProvider:
      handlers.registerMusicGenerationProvider ?? noopRegisterMusicGenerationProvider,
    registerWebFetchProvider: handlers.registerWebFetchProvider ?? noopRegisterWebFetchProvider,
    registerWebSearchProvider: handlers.registerWebSearchProvider ?? noopRegisterWebSearchProvider,
    registerInteractiveHandler:
      handlers.registerInteractiveHandler ?? noopRegisterInteractiveHandler,
    onConversationBindingResolved:
      handlers.onConversationBindingResolved ?? noopOnConversationBindingResolved,
    registerCommand: handlers.registerCommand ?? noopRegisterCommand,
    registerContextEngine: handlers.registerContextEngine ?? noopRegisterContextEngine,
    registerCompactionProvider:
      handlers.registerCompactionProvider ?? noopRegisterCompactionProvider,
    registerAgentHarness: handlers.registerAgentHarness ?? noopRegisterAgentHarness,
    registerDetachedTaskRuntime:
      handlers.registerDetachedTaskRuntime ?? noopRegisterDetachedTaskRuntime,
    registerMemoryCapability: handlers.registerMemoryCapability ?? noopRegisterMemoryCapability,
    registerMemoryPromptSection:
      handlers.registerMemoryPromptSection ?? noopRegisterMemoryPromptSection,
    registerMemoryPromptSupplement:
      handlers.registerMemoryPromptSupplement ?? noopRegisterMemoryPromptSupplement,
    registerMemoryCorpusSupplement:
      handlers.registerMemoryCorpusSupplement ?? noopRegisterMemoryCorpusSupplement,
    registerMemoryFlushPlan: handlers.registerMemoryFlushPlan ?? noopRegisterMemoryFlushPlan,
    registerMemoryRuntime: handlers.registerMemoryRuntime ?? noopRegisterMemoryRuntime,
    registerMemoryEmbeddingProvider:
      handlers.registerMemoryEmbeddingProvider ?? noopRegisterMemoryEmbeddingProvider,
    resolvePath: params.resolvePath,
    on: handlers.on ?? noopOn,
  };
}
