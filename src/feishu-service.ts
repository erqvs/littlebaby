#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import JSON5 from "json5";
import * as Lark from "@larksuiteoapi/node-sdk";
import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

type JsonRecord = Record<string, unknown>;

type ServiceConfig = {
  models?: {
    providers?: Record<string, { baseUrl?: string; apiKey?: string; models?: Array<{ id?: string }> }>;
  };
  agents?: {
    defaults?: {
      model?: { primary?: string; fallbacks?: string[] };
      userTimezone?: string;
      workspace?: string;
    };
  };
  channels?: {
    feishu?: FeishuConfig;
  };
  mcp?: {
    servers?: Record<string, McpServerConfig>;
  };
};

type FeishuConfig = {
  enabled?: boolean;
  defaultAccount?: string;
  connectionMode?: "websocket" | "webhook";
  appId?: unknown;
  appSecret?: unknown;
  encryptKey?: unknown;
  verificationToken?: unknown;
  domain?: "feishu" | "lark" | string;
  groupPolicy?: "allowlist" | "denylist" | "open" | string;
  groupAllowFrom?: Array<string | number>;
  groupDenyFrom?: Array<string | number>;
  dmPolicy?: string;
  chunkMode?: "length" | "newline";
  textChunkLimit?: number;
  accounts?: Record<string, Partial<FeishuConfig>>;
};

type ResolvedFeishuAccount = {
  accountId: string;
  appId: string;
  appSecret: string;
  domain?: "feishu" | "lark" | string;
  config: FeishuConfig;
};

type McpServerConfig = {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  url?: string;
  transport?: "stdio" | "sse" | "http" | "streamable-http" | string;
  headers?: Record<string, string>;
  disabled?: boolean;
  enabled?: boolean;
};

type FeishuMessageEvent = {
  sender: {
    sender_id: {
      open_id?: string;
      user_id?: string;
      union_id?: string;
    };
    sender_type?: string;
  };
  message: {
    message_id: string;
    chat_id: string;
    chat_type: "p2p" | "group" | "private";
    message_type: string;
    content: string;
    root_id?: string;
    parent_id?: string;
    thread_id?: string;
    mentions?: Array<{
      key?: string;
      name?: string;
      id: {
        open_id?: string;
        user_id?: string;
        union_id?: string;
      };
    }>;
  };
};

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
};

type ToolCall = {
  id?: string;
  type?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
};

type OpenAiTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: JsonRecord;
  };
};

type McpToolBinding = {
  serverName: string;
  toolName: string;
  openAiName: string;
  description: string;
  inputSchema: JsonRecord;
};

type ConversationEntry = {
  role: "user" | "assistant";
  name?: string;
  content: string;
  ts: number;
};

const DEFAULT_CONFIG_FILE = "littlebaby.json";
const DEFAULT_STATE_DIR = ".littlebaby";
const DEFAULT_CHUNK_LIMIT = 3800;
const DEFAULT_HISTORY_LIMIT = 18;
const MCP_CONNECT_TIMEOUT_MS = 45_000;
const MCP_TOOL_TIMEOUT_MS = 120_000;
const MODEL_TIMEOUT_MS = 180_000;
const MAX_TOOL_ROUNDS = 8;
const MAX_TOOL_RESULT_CHARS = 24_000;

const serviceStart = new Date();
const conversations = new Map<string, ConversationEntry[]>();
const processingMessages = new Set<string>();
const processedMessages = new Set<string>();

let shutdownRequested = false;
let historySaveTimer: NodeJS.Timeout | null = null;

function timestamp(): string {
  return new Date().toISOString();
}

function log(message: string): void {
  console.log(`${timestamp()} [service] ${message}`);
}

function warn(message: string): void {
  console.warn(`${timestamp()} [warn] ${message}`);
}

function error(message: string): void {
  console.error(`${timestamp()} [error] ${message}`);
}

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" || typeof item === "number" ? String(item).trim() : ""))
    .filter(Boolean);
}

function redactError(value: unknown): string {
  const raw = value instanceof Error ? value.message : String(value);
  return raw
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]")
    .replace(/([A-Za-z0-9_-]{16,})\.[A-Za-z0-9._-]{8,}/g, "[redacted-token]")
    .replace(/(api[_-]?key|token|secret)(["':= ]+)[^"',\s]+/gi, "$1$2[redacted]");
}

function printHelp(): void {
  console.log(
    [
      "LittleBaby minimal Feishu service",
      "",
      "Usage:",
      "  node dist-service/feishu-service.js [--port <port>] [--bind <mode>]",
      "",
      "The --port and --bind flags are accepted for systemd compatibility only.",
      "This entry opens no HTTP listener; it only connects to Feishu and configured MCP servers.",
    ].join("\n"),
  );
}

function parseServiceOptions(argv: string[]): void {
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
      if (token === "--port") {
        index += 1;
      }
      continue;
    }
    if (token === "--bind" || token.startsWith("--bind=")) {
      if (token === "--bind") {
        index += 1;
      }
      continue;
    }
    throw new Error(`Unsupported service option: ${token}`);
  }
}

function resolveStateDir(): string {
  const explicit = process.env.LITTLEBABY_STATE_DIR?.trim();
  if (explicit) {
    return resolveUserPath(explicit);
  }
  return path.join(os.homedir(), DEFAULT_STATE_DIR);
}

function resolveConfigPath(): string {
  const explicit = process.env.LITTLEBABY_CONFIG_PATH?.trim();
  if (explicit) {
    return resolveUserPath(explicit);
  }
  return path.join(resolveStateDir(), DEFAULT_CONFIG_FILE);
}

function resolveUserPath(input: string): string {
  if (input === "~") {
    return os.homedir();
  }
  if (input.startsWith("~/")) {
    return path.join(os.homedir(), input.slice(2));
  }
  return path.resolve(input);
}

function loadConfig(): ServiceConfig {
  const configPath = resolveConfigPath();
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  const parsed = JSON5.parse(fs.readFileSync(configPath, "utf8")) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("Config file must contain an object");
  }
  return parsed as ServiceConfig;
}

function historyPath(): string {
  return path.join(resolveStateDir(), "lite-history.json");
}

function dedupePath(): string {
  return path.join(resolveStateDir(), "lite-dedupe.json");
}

function loadStateFiles(): void {
  try {
    const raw = fs.readFileSync(historyPath(), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (isRecord(parsed)) {
      for (const [key, value] of Object.entries(parsed)) {
        if (!Array.isArray(value)) {
          continue;
        }
        const entries = value
          .filter(isRecord)
          .map((entry) => ({
            role: entry.role === "assistant" ? "assistant" : "user",
            name: readString(entry.name),
            content: typeof entry.content === "string" ? entry.content : "",
            ts: typeof entry.ts === "number" ? entry.ts : Date.now(),
          }))
          .filter((entry) => entry.content.trim());
        if (entries.length > 0) {
          conversations.set(key, entries.slice(-DEFAULT_HISTORY_LIMIT));
        }
      }
    }
  } catch {
    // Best effort only.
  }

  try {
    const raw = fs.readFileSync(dedupePath(), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      for (const id of parsed) {
        if (typeof id === "string" && id.trim()) {
          processedMessages.add(id.trim());
        }
      }
    }
  } catch {
    // Best effort only.
  }
}

function scheduleStateSave(): void {
  if (historySaveTimer) {
    return;
  }
  historySaveTimer = setTimeout(() => {
    historySaveTimer = null;
    saveStateFiles();
  }, 800);
  historySaveTimer.unref?.();
}

function saveStateFiles(): void {
  try {
    fs.mkdirSync(resolveStateDir(), { recursive: true });
    const historyObject: Record<string, ConversationEntry[]> = {};
    for (const [key, entries] of conversations) {
      historyObject[key] = entries.slice(-DEFAULT_HISTORY_LIMIT);
    }
    fs.writeFileSync(historyPath(), JSON.stringify(historyObject, null, 2));

    const dedupe = Array.from(processedMessages).slice(-2000);
    processedMessages.clear();
    for (const id of dedupe) {
      processedMessages.add(id);
    }
    fs.writeFileSync(dedupePath(), JSON.stringify(dedupe, null, 2));
  } catch (err) {
    warn(`state save failed: ${redactError(err)}`);
  }
}

function resolveAccountConfig(config: ServiceConfig): ResolvedFeishuAccount {
  const feishu = config.channels?.feishu;
  if (!feishu || feishu.enabled === false) {
    throw new Error("channels.feishu is not configured or disabled");
  }
  const accountId = readString(feishu.defaultAccount) ?? Object.keys(feishu.accounts ?? {})[0] ?? "main";
  const accountConfig = {
    ...feishu,
    ...(feishu.accounts?.[accountId] ?? {}),
  };
  const appId = resolveSecretLike(accountConfig.appId, "LITTLEBABY_FEISHU_APP_ID");
  const appSecret = resolveSecretLike(accountConfig.appSecret, "LITTLEBABY_FEISHU_APP_SECRET");
  if (!appId || !appSecret) {
    throw new Error(`Feishu account "${accountId}" is missing appId/appSecret`);
  }
  if ((accountConfig.connectionMode ?? "websocket") !== "websocket") {
    throw new Error("The minimal service currently supports Feishu websocket mode only");
  }
  return {
    accountId,
    appId,
    appSecret,
    domain: accountConfig.domain,
    config: accountConfig,
  };
}

function resolveSecretLike(value: unknown, envName?: string): string | undefined {
  const direct = readString(value);
  if (direct) {
    return direct;
  }
  if (isRecord(value)) {
    const id = readString(value.id);
    const source = readString(value.source);
    if (source === "env" && id) {
      return readString(process.env[id]);
    }
  }
  return envName ? readString(process.env[envName]) : undefined;
}

function resolveFeishuDomain(domain: ResolvedFeishuAccount["domain"]): Lark.Domain | string {
  if (domain === "lark") {
    return Lark.Domain.Lark;
  }
  if (!domain || domain === "feishu") {
    return Lark.Domain.Feishu;
  }
  return domain.replace(/\/+$/, "");
}

function createFeishuClient(account: ResolvedFeishuAccount): Lark.Client {
  return new Lark.Client({
    appId: account.appId,
    appSecret: account.appSecret,
    appType: Lark.AppType.SelfBuild,
    domain: resolveFeishuDomain(account.domain),
  });
}

async function fetchBotIdentity(account: ResolvedFeishuAccount): Promise<{
  botOpenId?: string;
  botName?: string;
}> {
  const client = createFeishuClient(account) as Lark.Client & {
    request: (opts: JsonRecord) => Promise<{ code?: number; msg?: string; bot?: { open_id?: string; app_name?: string } }>;
  };
  const response = await withTimeout(
    client.request({
      method: "GET",
      url: "/open-apis/bot/v3/info",
      timeout: 30_000,
    }),
    30_000,
    "Feishu bot info probe timed out",
  );
  if (response.code !== 0) {
    warn(`Feishu bot info probe failed: ${response.msg ?? response.code ?? "unknown"}`);
    return {};
  }
  return {
    botOpenId: readString(response.bot?.open_id),
    botName: readString(response.bot?.app_name),
  };
}

function createFeishuWsClient(account: ResolvedFeishuAccount): Lark.WSClient {
  return new Lark.WSClient({
    appId: account.appId,
    appSecret: account.appSecret,
    domain: resolveFeishuDomain(account.domain),
    loggerLevel: Lark.LoggerLevel.info,
  });
}

function createEventDispatcher(account: ResolvedFeishuAccount): Lark.EventDispatcher {
  return new Lark.EventDispatcher({
    encryptKey: resolveSecretLike(account.config.encryptKey),
    verificationToken: resolveSecretLike(account.config.verificationToken),
  });
}

function parseMessagePayload(value: unknown): FeishuMessageEvent | null {
  if (!isRecord(value) || !isRecord(value.sender) || !isRecord(value.message)) {
    return null;
  }
  const senderId = isRecord(value.sender.sender_id) ? value.sender.sender_id : null;
  if (!senderId) {
    return null;
  }
  const message = value.message;
  const messageId = readString(message.message_id);
  const chatId = readString(message.chat_id);
  const chatType = readString(message.chat_type);
  const messageType = readString(message.message_type);
  const content = typeof message.content === "string" ? message.content : undefined;
  if (
    !messageId ||
    !chatId ||
    !messageType ||
    content === undefined ||
    (chatType !== "p2p" && chatType !== "group" && chatType !== "private")
  ) {
    return null;
  }
  return value as FeishuMessageEvent;
}

function parseMessageText(event: FeishuMessageEvent): string {
  const raw = event.message.content;
  if (!raw) {
    return "";
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (event.message.message_type === "text" && isRecord(parsed)) {
      return typeof parsed.text === "string" ? normalizeMentionText(parsed.text, event) : "";
    }
    if (event.message.message_type === "post" && isRecord(parsed)) {
      return parsePostText(parsed);
    }
    if (isRecord(parsed)) {
      for (const key of ["text", "title", "content"]) {
        if (typeof parsed[key] === "string") {
          return normalizeMentionText(parsed[key], event);
        }
      }
    }
  } catch {
    return normalizeMentionText(raw, event);
  }
  return `[${event.message.message_type} message]`;
}

function parsePostText(value: JsonRecord): string {
  const parts: string[] = [];
  const zh = isRecord(value.zh_cn) ? value.zh_cn : undefined;
  const content = Array.isArray(zh?.content) ? zh?.content : [];
  for (const line of content) {
    if (!Array.isArray(line)) {
      continue;
    }
    const lineParts: string[] = [];
    for (const item of line) {
      if (!isRecord(item)) {
        continue;
      }
      if (typeof item.text === "string") {
        lineParts.push(item.text);
      } else if (typeof item.user_name === "string") {
        lineParts.push(`@${item.user_name}`);
      }
    }
    if (lineParts.length > 0) {
      parts.push(lineParts.join(""));
    }
  }
  return parts.join("\n").trim();
}

function normalizeMentionText(text: string, event: FeishuMessageEvent): string {
  let output = text;
  for (const mention of event.message.mentions ?? []) {
    const key = mention.key?.trim();
    const name = mention.name?.trim();
    if (key && name) {
      output = output.replaceAll(key, `@${name}`);
    }
  }
  return output.trim();
}

function isBotMentioned(event: FeishuMessageEvent, botOpenId?: string, botName?: string): boolean {
  if (event.message.chat_type !== "group") {
    return true;
  }
  for (const mention of event.message.mentions ?? []) {
    if (botOpenId && mention.id.open_id === botOpenId) {
      return true;
    }
    if (botName && mention.name?.includes(botName)) {
      return true;
    }
  }
  const text = parseMessageText(event);
  return text.includes("小橘") || (!!botName && text.includes(botName));
}

function isSenderAllowed(config: FeishuConfig, event: FeishuMessageEvent): boolean {
  if (event.message.chat_type !== "group") {
    return true;
  }
  const ids = new Set(
    [
      event.message.chat_id,
      event.sender.sender_id.open_id,
      event.sender.sender_id.user_id,
      event.sender.sender_id.union_id,
    ].filter((id): id is string => Boolean(id)),
  );
  const allow = readStringArray(config.groupAllowFrom);
  const deny = readStringArray(config.groupDenyFrom);
  if (deny.some((id) => ids.has(id))) {
    return false;
  }
  if (config.groupPolicy === "allowlist" && allow.length > 0) {
    return allow.some((id) => ids.has(id));
  }
  return true;
}

function sessionKeyFor(event: FeishuMessageEvent, accountId: string): string {
  const chatType = event.message.chat_type;
  if (chatType === "group") {
    const thread = event.message.root_id || event.message.thread_id;
    return `feishu:${accountId}:group:${event.message.chat_id}${thread ? `:thread:${thread}` : ""}`;
  }
  const peer =
    event.sender.sender_id.open_id ||
    event.sender.sender_id.user_id ||
    event.sender.sender_id.union_id ||
    event.message.chat_id;
  return `feishu:${accountId}:dm:${peer}`;
}

function senderLabel(event: FeishuMessageEvent): string {
  return (
    event.sender.sender_id.open_id ||
    event.sender.sender_id.user_id ||
    event.sender.sender_id.union_id ||
    "user"
  );
}

function addHistory(key: string, entry: ConversationEntry): void {
  const entries = conversations.get(key) ?? [];
  entries.push(entry);
  conversations.set(key, entries.slice(-DEFAULT_HISTORY_LIMIT));
  scheduleStateSave();
}

function resolveZaiBaseUrl(config: ServiceConfig): string {
  return (
    readString(config.models?.providers?.zai?.baseUrl) ??
    "https://open.bigmodel.cn/api/coding/paas/v4"
  ).replace(/\/+$/, "");
}

function resolveZaiApiKey(config: ServiceConfig): string | undefined {
  const providerKey = readString(config.models?.providers?.zai?.apiKey);
  if (providerKey) {
    return providerKey;
  }
  for (const envName of ["LITTLEBABY_ZAI_API_KEY", "Z_AI_API_KEY", "BIGMODEL_API_KEY"]) {
    const value = readString(process.env[envName]);
    if (value) {
      return value;
    }
  }
  for (const server of Object.values(config.mcp?.servers ?? {})) {
    const env = server.env ?? {};
    for (const key of ["Z_AI_API_KEY", "BIGMODEL_API_KEY"]) {
      const value = readString(env[key]);
      if (value) {
        return value;
      }
    }
  }
  return undefined;
}

function resolveModelId(config: ServiceConfig, fallbackIndex = 0): string {
  const primary = readString(config.agents?.defaults?.model?.primary);
  const fallback = config.agents?.defaults?.model?.fallbacks?.[fallbackIndex];
  const raw = fallbackIndex > 0 ? readString(fallback) ?? primary : primary;
  return (raw ?? "zai/glm-5-turbo").replace(/^zai\//, "");
}

function buildSystemPrompt(config: ServiceConfig): string {
  const timezone = readString(config.agents?.defaults?.userTimezone) ?? "Asia/Shanghai";
  const now = new Intl.DateTimeFormat("zh-CN", {
    timeZone: timezone,
    dateStyle: "full",
    timeStyle: "medium",
  }).format(new Date());
  return [
    "你是小橘，运行在 LittleBaby 飞书群聊助手里。",
    "你只在飞书里和用户互动，回复要自然、简洁、中文优先。",
    "需要查课程、记账、查资料、读网页或使用外部能力时，优先调用可用 MCP 工具。",
    "不要暴露密钥、Token、内部配置路径或系统实现细节。",
    "如果工具调用失败，直接说明失败原因并给出可执行的下一步。",
    `当前用户时区时间：${now}（${timezone}）。`,
  ].join("\n");
}

async function shouldReplyToGroup(params: {
  config: ServiceConfig;
  text: string;
  sessionKey: string;
  mentioned: boolean;
}): Promise<boolean> {
  if (params.mentioned) {
    return true;
  }
  const apiKey = resolveZaiApiKey(params.config);
  if (!apiKey) {
    return false;
  }
  const history = conversations.get(params.sessionKey) ?? [];
  const recent = history
    .slice(-8)
    .map((entry) => `${entry.role === "assistant" ? "小橘" : entry.name ?? "用户"}: ${entry.content}`)
    .join("\n");
  const prompt = [
    "判断飞书群聊里的 AI 助手“小橘”是否需要回复当前消息。",
    "只输出 YES 或 NO。",
    "",
    "需要回复：直接提到小橘、向 AI 求助、需要搜索/记账/查课程/总结/解释、接着小橘上一轮继续问。",
    "不需要回复：两个人普通闲聊、纯表情/感叹/无明确请求、与小橘无关。",
    "",
    `最近聊天：\n${recent || "(无)"}`,
    "",
    `当前消息：${params.text}`,
  ].join("\n");
  try {
    const result = await callZaiChat({
      config: params.config,
      apiKey,
      messages: [{ role: "user", content: prompt }],
      tools: [],
      timeoutMs: 45_000,
      maxTokens: 16,
      temperature: 0,
    });
    return result.content.trim().toUpperCase().startsWith("YES");
  } catch (err) {
    warn(`auto-reply classifier failed: ${redactError(err)}`);
    return false;
  }
}

async function generateReply(params: {
  config: ServiceConfig;
  mcp: McpHub;
  sessionKey: string;
  text: string;
  sender: string;
}): Promise<string> {
  const apiKey = resolveZaiApiKey(params.config);
  if (!apiKey) {
    return "ZAI API Key 没有配置，暂时无法回复。";
  }
  const tools = await params.mcp.openAiTools();
  const history = conversations.get(params.sessionKey) ?? [];
  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(params.config) },
    ...history.slice(-12).map((entry): ChatMessage => ({
      role: entry.role,
      content: `${entry.name ? `${entry.name}: ` : ""}${entry.content}`,
    })),
    { role: "user", content: `${params.sender}: ${params.text}` },
  ];

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const response = await callZaiChat({
      config: params.config,
      apiKey,
      messages,
      tools,
      timeoutMs: MODEL_TIMEOUT_MS,
    });
    if (response.toolCalls.length === 0) {
      return response.content.trim() || "我这边没有生成有效回复。";
    }
    messages.push({
      role: "assistant",
      content: response.content || null,
      tool_calls: response.toolCalls,
    });
    for (const toolCall of response.toolCalls) {
      const name = toolCall.function?.name ?? "";
      const argsText = toolCall.function?.arguments ?? "{}";
      const result = await params.mcp.callOpenAiTool(name, safeJsonParse(argsText));
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id ?? name,
        content: result,
      });
    }
  }
  return "工具调用轮次过多，我先停在这里。";
}

async function callZaiChat(params: {
  config: ServiceConfig;
  apiKey: string;
  messages: ChatMessage[];
  tools: OpenAiTool[];
  timeoutMs: number;
  maxTokens?: number;
  temperature?: number;
}): Promise<{ content: string; toolCalls: ToolCall[] }> {
  const body: JsonRecord = {
    model: resolveModelId(params.config),
    messages: params.messages,
    temperature: params.temperature ?? 0.4,
    max_tokens: params.maxTokens ?? 4096,
  };
  if (params.tools.length > 0) {
    body.tools = params.tools;
    body.tool_choice = "auto";
  }
  const response = await fetchWithTimeout(`${resolveZaiBaseUrl(params.config)}/chat/completions`, {
    timeoutMs: params.timeoutMs,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify(body),
    },
  });
  const text = await response.text();
  let payload: unknown;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`ZAI request failed with HTTP ${response.status}: ${summarizeUnknown(payload)}`);
  }
  const choice = isRecord(payload) && Array.isArray(payload.choices) ? payload.choices[0] : undefined;
  const message = isRecord(choice) && isRecord(choice.message) ? choice.message : undefined;
  const content = typeof message?.content === "string" ? message.content : "";
  const toolCalls = Array.isArray(message?.tool_calls) ? (message.tool_calls as ToolCall[]) : [];
  return { content, toolCalls };
}

function safeJsonParse(text: string): JsonRecord {
  try {
    const parsed = JSON.parse(text) as unknown;
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function summarizeUnknown(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 800 ? `${text.slice(0, 800)}...` : text;
}

async function fetchWithTimeout(paramsUrl: string, params: { init: RequestInit; timeoutMs: number }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs);
  try {
    return await fetch(paramsUrl, {
      ...params.init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

class McpHub {
  private readonly config: ServiceConfig;
  private readonly clients = new Map<string, { client: McpClient; transport: Transport }>();
  private readonly bindings = new Map<string, McpToolBinding>();
  private initPromise: Promise<void> | null = null;

  constructor(config: ServiceConfig) {
    this.config = config;
  }

  async openAiTools(): Promise<OpenAiTool[]> {
    await this.ensureInitialized();
    return Array.from(this.bindings.values()).map((binding) => ({
      type: "function",
      function: {
        name: binding.openAiName,
        description: binding.description,
        parameters: binding.inputSchema,
      },
    }));
  }

  async callOpenAiTool(openAiName: string, args: JsonRecord): Promise<string> {
    await this.ensureInitialized();
    const binding = this.bindings.get(openAiName);
    if (!binding) {
      return `Tool ${openAiName} is not available.`;
    }
    const entry = this.clients.get(binding.serverName);
    if (!entry) {
      return `MCP server ${binding.serverName} is not connected.`;
    }
    try {
      const result = await withTimeout(
        entry.client.callTool({ name: binding.toolName, arguments: args }),
        MCP_TOOL_TIMEOUT_MS,
        `MCP tool ${openAiName} timed out`,
      );
      return formatMcpToolResult(result);
    } catch (err) {
      return `MCP tool ${openAiName} failed: ${redactError(err)}`;
    }
  }

  async close(): Promise<void> {
    const closes = Array.from(this.clients.values()).map(async ({ client, transport }) => {
      await Promise.allSettled([client.close(), transport.close()]);
    });
    await Promise.allSettled(closes);
  }

  private async ensureInitialized(): Promise<void> {
    this.initPromise ??= this.initialize();
    return this.initPromise;
  }

  private async initialize(): Promise<void> {
    const servers = this.config.mcp?.servers ?? {};
    for (const [serverName, serverConfig] of Object.entries(servers)) {
      if (serverConfig.disabled || serverConfig.enabled === false) {
        continue;
      }
      try {
        const transport = createMcpTransport(serverName, serverConfig);
        if (!transport) {
          continue;
        }
        const client = new McpClient({
          name: `littlebaby-feishu-${serverName}`,
          version: "1.0.0",
        });
        await withTimeout(
          client.connect(transport),
          MCP_CONNECT_TIMEOUT_MS,
          `MCP server ${serverName} connect timed out`,
        );
        this.clients.set(serverName, { client, transport });
        const listed = await client.listTools();
        for (const tool of listed.tools ?? []) {
          const openAiName = uniqueToolName(this.bindings, serverName, tool.name);
          this.bindings.set(openAiName, {
            serverName,
            toolName: tool.name,
            openAiName,
            description: tool.description ? `[${serverName}] ${tool.description}` : `[${serverName}] ${tool.name}`,
            inputSchema: isRecord(tool.inputSchema) ? tool.inputSchema : { type: "object", properties: {} },
          });
        }
        log(`mcp[${serverName}]: connected with ${(listed.tools ?? []).length} tool(s)`);
      } catch (err) {
        warn(`mcp[${serverName}]: unavailable: ${redactError(err)}`);
      }
    }
  }
}

function createMcpTransport(serverName: string, serverConfig: McpServerConfig): Transport | null {
  if (serverConfig.url) {
    const headers = interpolateStringRecord(serverConfig.headers ?? {}, serverConfig.env ?? {});
    const requestInit = Object.keys(headers).length > 0 ? { headers } : undefined;
    const transport = (serverConfig.transport ?? "").toLowerCase();
    if (transport === "sse" || serverConfig.url.includes("/sse")) {
      return new SSEClientTransport(new URL(serverConfig.url), { requestInit });
    }
    return new StreamableHTTPClientTransport(new URL(serverConfig.url), { requestInit });
  }
  const command = readString(serverConfig.command);
  if (!command) {
    warn(`mcp[${serverName}]: missing command/url`);
    return null;
  }
  const env = {
    ...process.env,
    ...interpolateStringRecord(serverConfig.env ?? {}, serverConfig.env ?? {}),
  } as Record<string, string>;
  const args = (serverConfig.args ?? []).map((arg) => interpolateString(arg, env));
  return new StdioClientTransport({
    command,
    args,
    env,
    cwd: serverConfig.cwd,
    stderr: "pipe",
  });
}

function interpolateStringRecord(
  record: Record<string, string>,
  env: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, interpolateString(value, { ...process.env, ...env })]),
  );
}

function interpolateString(value: string, env: Record<string, string | undefined>): string {
  return value.replace(/\$\$?\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_match, name: string) => env[name] ?? "");
}

function uniqueToolName(bindings: Map<string, McpToolBinding>, serverName: string, toolName: string): string {
  const base = sanitizeToolName(`${serverName}__${toolName}`);
  let candidate = base;
  let index = 2;
  while (bindings.has(candidate)) {
    candidate = `${base.slice(0, 56)}_${index}`;
    index += 1;
  }
  return candidate;
}

function sanitizeToolName(value: string): string {
  const sanitized = value.replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  const trimmed = sanitized.slice(0, 64);
  return trimmed || "tool";
}

function formatMcpToolResult(result: unknown): string {
  if (!isRecord(result)) {
    return summarizeUnknown(result).slice(0, MAX_TOOL_RESULT_CHARS);
  }
  const parts: string[] = [];
  const content = result.content;
  if (Array.isArray(content)) {
    for (const item of content) {
      if (!isRecord(item)) {
        continue;
      }
      if (item.type === "text" && typeof item.text === "string") {
        parts.push(item.text);
      } else if (item.type === "resource" && isRecord(item.resource)) {
        if (typeof item.resource.text === "string") {
          parts.push(item.resource.text);
        } else {
          parts.push(JSON.stringify(item.resource));
        }
      } else {
        parts.push(JSON.stringify(item));
      }
    }
  }
  if (isRecord(result.structuredContent)) {
    parts.push(JSON.stringify(result.structuredContent, null, 2));
  }
  const text = parts.join("\n\n").trim() || JSON.stringify(result);
  return text.length > MAX_TOOL_RESULT_CHARS ? `${text.slice(0, MAX_TOOL_RESULT_CHARS)}\n...[truncated]` : text;
}

async function handleMessage(params: {
  config: ServiceConfig;
  account: ResolvedFeishuAccount;
  mcp: McpHub;
  client: Lark.Client;
  event: FeishuMessageEvent;
  botOpenId?: string;
  botName?: string;
}): Promise<void> {
  const { config, account, event } = params;
  const messageId = event.message.message_id.trim();
  if (!messageId || processedMessages.has(messageId) || processingMessages.has(messageId)) {
    return;
  }
  processingMessages.add(messageId);
  try {
    if (event.sender.sender_type === "app" || event.sender.sender_id.open_id === params.botOpenId) {
      processedMessages.add(messageId);
      return;
    }
    if (!isSenderAllowed(account.config, event)) {
      processedMessages.add(messageId);
      return;
    }
    const text = parseMessageText(event);
    if (!text.trim()) {
      processedMessages.add(messageId);
      return;
    }
    const key = sessionKeyFor(event, account.accountId);
    const mentioned = isBotMentioned(event, params.botOpenId, params.botName);
    if (event.message.chat_type === "group") {
      const shouldReply = await shouldReplyToGroup({
        config,
        text,
        sessionKey: key,
        mentioned,
      });
      if (!shouldReply) {
        addHistory(key, { role: "user", name: senderLabel(event), content: text, ts: Date.now() });
        processedMessages.add(messageId);
        return;
      }
    }

    addHistory(key, { role: "user", name: senderLabel(event), content: text, ts: Date.now() });
    const reply = await generateReply({
      config,
      mcp: params.mcp,
      sessionKey: key,
      text,
      sender: senderLabel(event),
    });
    const chunks = chunkReply(reply, account.config);
    for (const chunk of chunks) {
      await sendFeishuReply({
        account,
        client: params.client,
        event,
        text: chunk,
      });
      await sleep(250);
    }
    addHistory(key, { role: "assistant", content: reply, ts: Date.now() });
    processedMessages.add(messageId);
  } finally {
    processingMessages.delete(messageId);
    scheduleStateSave();
  }
}

function chunkReply(text: string, config: FeishuConfig): string[] {
  const limit =
    typeof config.textChunkLimit === "number" && config.textChunkLimit > 0
      ? Math.min(Math.floor(config.textChunkLimit), DEFAULT_CHUNK_LIMIT)
      : DEFAULT_CHUNK_LIMIT;
  const source = text.trim();
  if (!source) {
    return [];
  }
  if (source.length <= limit) {
    return [source];
  }
  const chunks: string[] = [];
  const paragraphs = source.split(/\n{2,}/);
  let current = "";
  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= limit) {
      current = candidate;
      continue;
    }
    if (current) {
      chunks.push(current);
      current = "";
    }
    if (paragraph.length <= limit) {
      current = paragraph;
      continue;
    }
    for (let index = 0; index < paragraph.length; index += limit) {
      chunks.push(paragraph.slice(index, index + limit));
    }
  }
  if (current) {
    chunks.push(current);
  }
  return chunks;
}

function buildPostContent(text: string): string {
  return JSON.stringify({
    zh_cn: {
      content: [
        [
          {
            tag: "md",
            text,
          },
        ],
      ],
    },
  });
}

async function sendFeishuReply(params: {
  account: ResolvedFeishuAccount;
  client: Lark.Client;
  event: FeishuMessageEvent;
  text: string;
}): Promise<void> {
  const content = buildPostContent(params.text);
  const data = { content, msg_type: "post" };
  const messageId = params.event.message.message_id;
  const receiveId = params.event.message.chat_id;
  try {
    const response = (await params.client.im.message.reply({
      path: { message_id: messageId },
      data,
    })) as { code?: number; msg?: string };
    if (response.code === 0 || response.code === undefined) {
      return;
    }
    warn(`Feishu reply failed, falling back to direct send: ${response.msg ?? response.code}`);
  } catch (err) {
    warn(`Feishu reply failed, falling back to direct send: ${redactError(err)}`);
  }
  const response = (await params.client.im.message.create({
    params: { receive_id_type: "chat_id" },
    data: {
      receive_id: receiveId,
      content,
      msg_type: "post",
    },
  })) as { code?: number; msg?: string };
  if (response.code !== 0 && response.code !== undefined) {
    throw new Error(`Feishu send failed: ${response.msg ?? response.code}`);
  }
}

async function runFeishuService(config: ServiceConfig, abortSignal: AbortSignal): Promise<void> {
  const account = resolveAccountConfig(config);
  const client = createFeishuClient(account);
  const identity = await fetchBotIdentity(account).catch((err) => {
    warn(`Feishu bot identity probe failed: ${redactError(err)}`);
    return {};
  });
  log(`feishu[${account.accountId}]: bot open_id resolved: ${identity.botOpenId ? "[ok]" : "unknown"}`);

  const mcp = new McpHub(config);
  const dispatcher = createEventDispatcher(account);
  dispatcher.register({
    "im.message.receive_v1": async (data: unknown) => {
      const event = parseMessagePayload(data);
      if (!event) {
        warn(`feishu[${account.accountId}]: malformed message event ignored`);
        return;
      }
      void handleMessage({
        config,
        account,
        mcp,
        client,
        event,
        botOpenId: identity.botOpenId,
        botName: identity.botName,
      }).catch((err) => {
        error(`feishu[${account.accountId}]: message handler failed: ${redactError(err)}`);
      });
    },
    "im.message.message_read_v1": async () => undefined,
    "im.chat.member.bot.added_v1": async () => undefined,
    "im.chat.member.bot.deleted_v1": async () => undefined,
  });

  const wsClient = createFeishuWsClient(account);
  const close = async () => {
    try {
      wsClient.close();
    } catch {
      // Ignore close races.
    }
    await mcp.close();
    saveStateFiles();
  };
  abortSignal.addEventListener(
    "abort",
    () => {
      void close();
    },
    { once: true },
  );
  log(`feishu[${account.accountId}]: starting WebSocket connection`);
  await wsClient.start({ eventDispatcher: dispatcher });
  log(`feishu[${account.accountId}]: WebSocket client started`);
  await new Promise<void>((resolve) => {
    if (abortSignal.aborted) {
      resolve();
      return;
    }
    abortSignal.addEventListener("abort", () => resolve(), { once: true });
  });
}

function createAbortSignal(): AbortSignal {
  const controller = new AbortController();
  const abort = () => {
    if (controller.signal.aborted) {
      return;
    }
    shutdownRequested = true;
    log("shutdown signal received; stopping Feishu service");
    controller.abort();
    const forceExitTimer = setTimeout(() => process.exit(0), 5000);
    forceExitTimer.unref?.();
  };
  process.once("SIGINT", abort);
  process.once("SIGTERM", abort);
  return controller.signal;
}

async function main(argv: string[]): Promise<void> {
  process.title = "littlebaby-feishu-service";
  parseServiceOptions(argv);
  loadStateFiles();
  const config = loadConfig();
  log(`starting minimal Feishu service, booted at ${serviceStart.toISOString()}`);
  const abortSignal = createAbortSignal();
  await runFeishuService(config, abortSignal);
  if (shutdownRequested || abortSignal.aborted) {
    process.exit(0);
  }
}

process.on("uncaughtException", (err) => {
  error(`uncaught exception: ${redactError(err)}`);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  error(`unhandled rejection: ${redactError(reason)}`);
});

void main(process.argv).catch((err) => {
  error(`service failed to start: ${redactError(err)}`);
  process.exit(1);
});
