#!/usr/bin/env node
import fs from "node:fs";
import { enableCompileCache } from "node:module";
import path from "node:path";
import process from "node:process";
import JSON5 from "json5";
import {
  listFeishuAccountIds,
  resolveDefaultFeishuAccountId,
  resolveFeishuAccount,
} from "../extensions/feishu/src/accounts.js";
import { monitorFeishuProvider } from "../extensions/feishu/src/monitor.js";
import { setFeishuRuntime } from "../extensions/feishu/src/runtime.js";
import type { ResolvedFeishuAccount } from "../extensions/feishu/src/types.js";
import zaiEntry from "../extensions/zai/index.js";
import type { ChannelPlugin } from "./channels/plugins/types.plugin.js";
import { resolveConfigPath } from "./config/paths.js";
import { setRuntimeConfigSnapshot } from "./config/runtime-snapshot.js";
import type { LittleBabyConfig } from "./config/types.js";
import type { GatewayBindMode } from "./config/types.gateway.js";
import { isTruthyEnvValue, normalizeEnv } from "./infra/env.js";
import { formatUncaughtError, formatErrorMessage } from "./infra/errors.js";
import { ensureLittleBabyExecMarkerOnProcess } from "./infra/littlebaby-exec-env.js";
import { installUnhandledRejectionHandler } from "./infra/unhandled-rejections.js";
import { installProcessWarningFilter } from "./infra/warning-filter.js";
import { setConsoleTimestampPrefix } from "./logging/console.js";
import { createSubsystemLogger } from "./logging/subsystem.js";
import { createEmptyPluginRegistry } from "./plugins/registry-empty.js";
import {
  pinActivePluginChannelRegistry,
  setActivePluginRegistry,
} from "./plugins/runtime.js";
import { createPluginRuntime } from "./plugins/runtime/index.js";
import type { LittleBabyPluginApi, PluginLogger, ProviderPlugin } from "./plugins/types.js";
import type { PluginRecord, PluginRegistry } from "./plugins/registry-types.js";
import type { RuntimeEnv } from "./runtime.js";

const log = createSubsystemLogger("service");
const VALID_BIND_MODES = new Set<GatewayBindMode>([
  "loopback",
  "lan",
  "auto",
  "custom",
  "tailnet",
]);
let shutdownRequested = false;

type ServiceOptions = {
  port?: number;
  bind?: GatewayBindMode;
};

const feishuServiceChannelPlugin: ChannelPlugin<ResolvedFeishuAccount> = {
  id: "feishu",
  meta: {
    id: "feishu",
    label: "Feishu",
    selectionLabel: "Feishu/Lark",
    docsPath: "/channels/feishu",
    docsLabel: "feishu",
    blurb: "Feishu enterprise messaging.",
    aliases: ["lark"],
    order: 35,
    markdownCapable: true,
  },
  capabilities: {
    chatTypes: ["direct", "group"],
    reply: true,
    media: true,
    reactions: true,
    threads: true,
    blockStreaming: true,
  },
  config: {
    listAccountIds: listFeishuAccountIds,
    defaultAccountId: resolveDefaultFeishuAccountId,
    resolveAccount: (cfg, accountId) => resolveFeishuAccount({ cfg, accountId }),
    isEnabled: (account) => account.enabled,
    isConfigured: (account) => account.configured,
    unconfiguredReason: () => "Feishu account is not configured",
    describeAccount: (account) => ({
      accountId: account.accountId,
      enabled: account.enabled,
      configured: account.configured,
      name: account.name,
      mode: account.config?.connectionMode ?? "websocket",
    }),
  },
};

const serviceRuntime: RuntimeEnv = {
  log: (...args) => console.log(...args),
  error: (...args) => console.error(...args),
  exit: (code) => {
    process.exit(code);
    throw new Error("unreachable");
  },
};

function printHelp(): void {
  console.log(
    [
      "LittleBaby Feishu service entry",
      "",
      "Usage:",
      "  node dist-service/feishu-service.js [--port <port>] [--bind <mode>]",
      "",
      "This production entry starts Feishu directly and does not open a gateway listener.",
      'The --port and --bind flags are accepted for systemd compatibility only.',
    ].join("\n"),
  );
}

function readOptionValue(argv: string[], index: number, name: string): string | undefined {
  const token = argv[index];
  const inlinePrefix = `${name}=`;
  if (token.startsWith(inlinePrefix)) {
    return token.slice(inlinePrefix.length);
  }
  return argv[index + 1];
}

function parseServiceOptions(argv: string[]): ServiceOptions {
  const opts: ServiceOptions = {};
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      printHelp();
      process.exit(0);
    }
    if (token === "--allow-unconfigured") {
      continue;
    }
    if (token === "--port" || token.startsWith("--port=")) {
      const raw = readOptionValue(argv, index, "--port");
      if (token === "--port") {
        index += 1;
      }
      const port = Number.parseInt(raw ?? "", 10);
      if (!Number.isInteger(port) || port <= 0) {
        throw new Error("Invalid --port");
      }
      opts.port = port;
      continue;
    }
    if (token === "--bind" || token.startsWith("--bind=")) {
      const raw = readOptionValue(argv, index, "--bind");
      if (token === "--bind") {
        index += 1;
      }
      if (!raw || !VALID_BIND_MODES.has(raw as GatewayBindMode)) {
        throw new Error('Invalid --bind (use "loopback", "lan", "tailnet", "auto", or "custom")');
      }
      opts.bind = raw as GatewayBindMode;
      continue;
    }
    throw new Error(`Unsupported service option: ${token}`);
  }
  return opts;
}

function loadFeishuServiceConfig(): LittleBabyConfig {
  const configPath = resolveConfigPath(process.env);
  if (!fs.existsSync(configPath)) {
    return {};
  }
  try {
    const parsed = JSON5.parse(fs.readFileSync(configPath, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Config file must contain an object");
    }
    return parsed as LittleBabyConfig;
  } catch (error) {
    throw new Error(`Failed to read service config at ${configPath}: ${formatErrorMessage(error)}`);
  }
}

function createLoadedPluginRecord(params: {
  id: string;
  name: string;
  description: string;
  source: string;
  rootDir: string;
  channelIds?: string[];
  providerIds?: string[];
}): PluginRecord {
  return {
    id: params.id,
    name: params.name,
    description: params.description,
    source: params.source,
    rootDir: params.rootDir,
    origin: "bundled",
    enabled: true,
    imported: true,
    status: "loaded",
    toolNames: [],
    hookNames: [],
    channelIds: params.channelIds ?? [],
    cliBackendIds: [],
    providerIds: params.providerIds ?? [],
    speechProviderIds: [],
    realtimeTranscriptionProviderIds: [],
    realtimeVoiceProviderIds: [],
    mediaUnderstandingProviderIds: [],
    imageGenerationProviderIds: [],
    videoGenerationProviderIds: [],
    musicGenerationProviderIds: [],
    webFetchProviderIds: [],
    webSearchProviderIds: [],
    memoryEmbeddingProviderIds: [],
    agentHarnessIds: [],
    gatewayMethods: [],
    cliCommands: [],
    services: [],
    commands: [],
    httpRoutes: 0,
    hookCount: 0,
    configSchema: false,
  };
}

function createServicePluginLogger(): PluginLogger {
  return {
    debug: (message) => log.debug?.(message),
    info: (message) => log.info(message),
    warn: (message) => log.warn(message),
    error: (message) => log.error(message),
  };
}

function installFeishuOnlyPluginRegistry(cfg: LittleBabyConfig): void {
  const workspaceDir = process.cwd();
  const runtime = createPluginRuntime();
  const registry: PluginRegistry = createEmptyPluginRegistry();
  const feishuRoot = path.join(workspaceDir, "extensions", "feishu");
  const zaiRoot = path.join(workspaceDir, "extensions", "zai");
  const providers: ProviderPlugin[] = [];

  setFeishuRuntime(runtime);
  registry.plugins.push(
    createLoadedPluginRecord({
      id: "feishu",
      name: "Feishu",
      description: "LittleBaby Feishu channel plugin",
      source: "bundled:feishu",
      rootDir: feishuRoot,
      channelIds: ["feishu"],
    }),
  );
  registry.channels.push({
    pluginId: "feishu",
    pluginName: "Feishu",
    plugin: feishuServiceChannelPlugin,
    source: "bundled:feishu",
    rootDir: feishuRoot,
  });
  registry.channelSetups.push({
    pluginId: "feishu",
    pluginName: "Feishu",
    plugin: feishuServiceChannelPlugin,
    source: "bundled:feishu",
    enabled: true,
    rootDir: feishuRoot,
  });

  const logger = createServicePluginLogger();
  zaiEntry.register({
    id: "zai",
    name: "Z.AI Provider",
    description: "Bundled Z.AI provider plugin",
    source: "bundled:zai",
    rootDir: zaiRoot,
    registrationMode: "full",
    config: cfg,
    runtime,
    logger,
    registerProvider: (provider) => {
      providers.push(provider);
    },
  } as LittleBabyPluginApi);
  registry.plugins.push(
    createLoadedPluginRecord({
      id: "zai",
      name: "Z.AI Provider",
      description: "Bundled Z.AI provider plugin",
      source: "bundled:zai",
      rootDir: zaiRoot,
      providerIds: providers.map((provider) => provider.id),
    }),
  );
  for (const provider of providers) {
    registry.providers.push({
      pluginId: "zai",
      pluginName: "Z.AI Provider",
      provider,
      source: "bundled:zai",
      rootDir: zaiRoot,
    });
  }

  setActivePluginRegistry(registry, "feishu-service", "default", workspaceDir);
  pinActivePluginChannelRegistry(registry);
}

function createAbortSignal(): AbortSignal {
  const controller = new AbortController();
  const abort = () => {
    if (!controller.signal.aborted) {
      shutdownRequested = true;
      log.info("shutdown signal received; stopping Feishu service");
      controller.abort();
      const forceExitTimer = setTimeout(() => process.exit(0), 3000);
      forceExitTimer.unref?.();
    }
  };
  process.once("SIGINT", abort);
  process.once("SIGTERM", abort);
  return controller.signal;
}

async function main(argv: string[]): Promise<void> {
  process.title = "littlebaby-feishu-service";
  ensureLittleBabyExecMarkerOnProcess();
  installProcessWarningFilter();
  installUnhandledRejectionHandler();
  normalizeEnv();
  setConsoleTimestampPrefix(true);
  if (!isTruthyEnvValue(process.env.NODE_DISABLE_COMPILE_CACHE)) {
    try {
      enableCompileCache();
    } catch {
      // Best effort only.
    }
  }

  const { installGaxiosFetchCompat } = await import("./infra/gaxios-fetch-compat.js");
  await installGaxiosFetchCompat();

  parseServiceOptions(argv);
  const cfg = loadFeishuServiceConfig();
  setRuntimeConfigSnapshot(cfg, cfg);
  installFeishuOnlyPluginRegistry(cfg);

  log.info("starting Feishu-only service entry without gateway listener");
  const abortSignal = createAbortSignal();
  await monitorFeishuProvider({
    config: cfg,
    runtime: serviceRuntime,
    abortSignal,
  });
  if (shutdownRequested || abortSignal.aborted) {
    process.exit(0);
  }
}

process.on("uncaughtException", (error) => {
  console.error("[littlebaby-service] Uncaught exception:", formatUncaughtError(error));
  process.exit(1);
});

void main(process.argv).catch((error) => {
  console.error("[littlebaby-service] Feishu service failed to start:", formatErrorMessage(error));
  process.exit(1);
});
