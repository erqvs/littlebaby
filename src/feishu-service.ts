#!/usr/bin/env node
import crypto from "node:crypto";
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
import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

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
  memory?: {
    mysql?: MysqlMemoryConfig;
  };
  database?: {
    mysql?: MysqlMemoryConfig;
  };
  mysql?: MysqlMemoryConfig;
};

type MysqlMemoryConfig = {
  enabled?: boolean;
  disabled?: boolean;
  host?: string;
  port?: number | string;
  user?: string;
  password?: string;
  database?: string;
  connectionLimit?: number | string;
  restoreRecentLimit?: number | string;
  saveRawEvent?: boolean;
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
  toolTimeoutMs?: number | string;
  toolAttempts?: number | string;
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
    create_time?: string;
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

type DbMessageRef = {
  sessionId: number;
  messageId: number;
};

type GenerateReplyResult = {
  text: string;
  toolRounds: number;
};

type ToolCallTrace = {
  memory?: MysqlMemoryStore | null;
  aiTurnId?: number;
  toolCallId?: string;
};

type ContextDocument = {
  name: string;
  docType: string;
  title?: string;
  content: string;
};

const DEFAULT_CONFIG_FILE = "littlebaby.json";
const DEFAULT_STATE_DIR = ".littlebaby";
const DEFAULT_CHUNK_LIMIT = 3800;
const DEFAULT_MYSQL_RESTORE_LIMIT = 200;
const CONTEXT_DOCUMENT_REFRESH_MS = 60_000;
const CONTEXT_DOCUMENT_MAX_CHARS = 12_000;
const CONTEXT_DOCUMENT_TOTAL_MAX_CHARS = 36_000;
const MCP_CONNECT_TIMEOUT_MS = 45_000;
const MCP_TOOL_TIMEOUT_MS = 120_000;
const MCP_TOOL_MAX_ATTEMPTS = 4;
const MCP_TOOL_RETRY_BASE_DELAY_MS = 750;
const MODEL_TIMEOUT_MS = 180_000;
const MAX_TOOL_ROUNDS = 4;
const DB_RESULT_PREVIEW_CHARS = 8_000;

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

function readPositiveInteger(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : NaN;
  if (!Number.isFinite(number) || number <= 0) {
    return undefined;
  }
  return Math.floor(number);
}

function readBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
  }
  return undefined;
}

function truncateForDb(value: string, limit = DB_RESULT_PREVIEW_CHARS): string {
  return value.length > limit ? `${value.slice(0, limit)}\n...[truncated for database]` : value;
}

function jsonForDb(value: unknown): string | null {
  if (value === undefined) {
    return null;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ error: "unserializable value" });
  }
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function truncateForPrompt(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }
  const headChars = Math.max(1, Math.floor(limit * 0.75));
  const tailChars = Math.max(1, Math.floor(limit * 0.15));
  return [
    value.slice(0, headChars),
    "",
    `...[truncated ${value.length - headChars - tailChars} chars]...`,
    "",
    value.slice(-tailChars),
  ].join("\n");
}

function buildContextDocumentsPrompt(documents: ContextDocument[]): string {
  if (documents.length === 0) {
    return "";
  }
  const sections: string[] = [
    "## MySQL 上下文文档",
    "以下内容来自 LittleBaby 的长期上下文文档库，用来约束人格、用户识别、长期记忆和工具偏好。",
    "这些文档优先级低于本 system prompt 前面的安全规则、当前飞书消息和用户明确要求。",
    "不要向用户泄露文档中的原始飞书 ID、内部路径或隐私内容；只把它们用于识别和生成更合适的回复。",
    "旧 AGENTS/TOOLS 里的非 Feishu 平台规则只作为背景，不要把 Discord/WhatsApp/Heartbeat 协议直接照搬到飞书回复。",
    "",
  ];
  let usedChars = sections.join("\n").length;
  for (const doc of documents) {
    const content = truncateForPrompt(doc.content.trim(), CONTEXT_DOCUMENT_MAX_CHARS);
    const title = doc.title ? ` - ${doc.title}` : "";
    const block = [`### ${doc.name}${title}`, `type: ${doc.docType}`, "", content, ""].join("\n");
    const remaining = CONTEXT_DOCUMENT_TOTAL_MAX_CHARS - usedChars;
    if (remaining <= 0) {
      sections.push("...[additional context documents truncated]...");
      break;
    }
    if (block.length > remaining) {
      sections.push(truncateForPrompt(block, remaining));
      break;
    }
    sections.push(block);
    usedChars += block.length;
  }
  return sections.join("\n").trim();
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
          conversations.set(key, entries);
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
      historyObject[key] = entries;
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

type ResolvedMysqlMemoryConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  restoreRecentLimit: number;
  saveRawEvent: boolean;
};

function resolveMysqlMemoryConfig(config: ServiceConfig): ResolvedMysqlMemoryConfig | null {
  const raw = config.memory?.mysql ?? config.database?.mysql ?? config.mysql;
  const hasEnv =
    readString(process.env.LITTLEBABY_MYSQL_USER) !== undefined ||
    readString(process.env.LITTLEBABY_MYSQL_PASSWORD) !== undefined ||
    readString(process.env.LITTLEBABY_MYSQL_DATABASE) !== undefined;
  if (!raw && !hasEnv) {
    return null;
  }
  if (raw?.disabled || raw?.enabled === false) {
    return null;
  }
  const user = readString(process.env.LITTLEBABY_MYSQL_USER) ?? readString(raw?.user);
  const password = readString(process.env.LITTLEBABY_MYSQL_PASSWORD) ?? readString(raw?.password);
  if (!user || !password) {
    warn("memory mysql config is present but user/password is missing; database memory disabled");
    return null;
  }
  return {
    host: readString(process.env.LITTLEBABY_MYSQL_HOST) ?? readString(raw?.host) ?? "127.0.0.1",
    port: readPositiveInteger(process.env.LITTLEBABY_MYSQL_PORT ?? raw?.port) ?? 3306,
    user,
    password,
    database: readString(process.env.LITTLEBABY_MYSQL_DATABASE) ?? readString(raw?.database) ?? "littlebaby",
    connectionLimit: readPositiveInteger(process.env.LITTLEBABY_MYSQL_CONNECTION_LIMIT ?? raw?.connectionLimit) ?? 5,
    restoreRecentLimit:
      readPositiveInteger(process.env.LITTLEBABY_MYSQL_RESTORE_RECENT_LIMIT ?? raw?.restoreRecentLimit) ??
      DEFAULT_MYSQL_RESTORE_LIMIT,
    saveRawEvent: readBoolean(process.env.LITTLEBABY_MYSQL_SAVE_RAW_EVENT) ?? readBoolean(raw?.saveRawEvent) ?? false,
  };
}

function feishuMessageDate(event: FeishuMessageEvent): Date | null {
  const raw = readString(event.message.create_time);
  if (!raw) {
    return null;
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return new Date(numeric < 1_000_000_000_000 ? numeric * 1000 : numeric);
}

function senderIdFor(event: FeishuMessageEvent): string | null {
  return (
    event.sender.sender_id.open_id ||
    event.sender.sender_id.user_id ||
    event.sender.sender_id.union_id ||
    null
  );
}

function sessionTypeFor(event: FeishuMessageEvent): string {
  if (event.message.chat_type !== "group") {
    return "dm";
  }
  return event.message.root_id || event.message.thread_id ? "group_thread" : "group";
}

function rowDateToMillis(value: unknown): number {
  if (value instanceof Date) {
    return value.getTime();
  }
  const millis = Date.parse(String(value));
  return Number.isFinite(millis) ? millis : Date.now();
}

class MysqlMemoryStore {
  private pool: Pool | null = null;
  private readonly sessionIds = new Map<string, number>();
  private contextDocumentsPrompt = "";
  private contextDocumentsLoadedAt = 0;

  constructor(private readonly config: ResolvedMysqlMemoryConfig) {}

  async initialize(): Promise<void> {
    this.pool = mysql.createPool({
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      charset: "utf8mb4",
      connectionLimit: this.config.connectionLimit,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10_000,
    });
    await this.pool.query("SELECT 1");
    log(`memory mysql: connected to ${this.config.host}:${this.config.port}/${this.config.database}`);
    await this.refreshContextDocuments();
  }

  async close(): Promise<void> {
    if (!this.pool) {
      return;
    }
    await this.pool.end();
    this.pool = null;
  }

  async restoreRecentConversations(): Promise<void> {
    const pool = this.requirePool();
    const limit = this.config.restoreRecentLimit;
    if (limit <= 0) {
      return;
    }
    const [rows] = await pool.execute<RowDataPacket[]>(
      `
        SELECT session_key, role, sender_name, content, created_at
        FROM (
          SELECT
            s.session_key,
            m.role,
            m.sender_name,
            m.content,
            m.created_at,
            m.id,
            ROW_NUMBER() OVER (PARTITION BY m.session_id ORDER BY m.created_at DESC, m.id DESC) AS rn
          FROM lb_chat_messages m
          JOIN lb_chat_sessions s ON s.id = m.session_id
          WHERE m.role IN ('user', 'assistant')
        ) recent
        WHERE rn <= ?
        ORDER BY session_key ASC, created_at ASC, id ASC
      `,
      [limit],
    );
    const restored = new Map<string, ConversationEntry[]>();
    for (const row of rows) {
      const sessionKey = readString(row.session_key);
      const content = typeof row.content === "string" ? row.content : "";
      if (!sessionKey || !content.trim()) {
        continue;
      }
      const entries = restored.get(sessionKey) ?? [];
      entries.push({
        role: row.role === "assistant" ? "assistant" : "user",
        name: readString(row.sender_name),
        content,
        ts: rowDateToMillis(row.created_at),
      });
      restored.set(sessionKey, entries);
    }
    for (const [sessionKey, entries] of restored) {
      conversations.set(sessionKey, entries);
    }
    if (restored.size > 0) {
      log(`memory mysql: restored recent history for ${restored.size} session(s)`);
    }
  }

  async getContextDocumentsPrompt(): Promise<string> {
    if (Date.now() - this.contextDocumentsLoadedAt > CONTEXT_DOCUMENT_REFRESH_MS) {
      await this.refreshContextDocuments();
    }
    return this.contextDocumentsPrompt;
  }

  async recordUserMessage(params: {
    accountId: string;
    event: FeishuMessageEvent;
    sessionKey: string;
    content: string;
    senderName: string;
    mentionedBot: boolean;
    shouldReply: boolean;
  }): Promise<DbMessageRef | null> {
    try {
      const createdAt = feishuMessageDate(params.event) ?? new Date();
      const sessionId = await this.upsertSession({
        accountId: params.accountId,
        sessionKey: params.sessionKey,
        event: params.event,
        lastMessageAt: createdAt,
      });
      const pool = this.requirePool();
      const rawEvent = this.config.saveRawEvent ? jsonForDb(params.event) : null;
      const [result] = await pool.execute<ResultSetHeader>(
        `
          INSERT INTO lb_chat_messages (
            session_id, channel, account_id, external_message_id, reply_to_external_message_id,
            root_external_message_id, parent_external_message_id, role, message_type, sender_id,
            sender_name, content, content_sha256, mentioned_bot, should_reply, raw_event,
            metadata, external_created_at
          ) VALUES (?, 'feishu', ?, ?, NULL, ?, ?, 'user', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            id = LAST_INSERT_ID(id),
            content = VALUES(content),
            content_sha256 = VALUES(content_sha256),
            mentioned_bot = VALUES(mentioned_bot),
            should_reply = VALUES(should_reply),
            raw_event = COALESCE(VALUES(raw_event), raw_event),
            metadata = VALUES(metadata),
            updated_at = CURRENT_TIMESTAMP(3)
        `,
        [
          sessionId,
          params.accountId,
          params.event.message.message_id,
          params.event.message.root_id ?? null,
          params.event.message.parent_id ?? null,
          params.event.message.message_type,
          senderIdFor(params.event),
          params.senderName,
          params.content,
          sha256Hex(params.content),
          params.mentionedBot ? 1 : 0,
          params.shouldReply ? 1 : 0,
          rawEvent,
          jsonForDb({
            chatType: params.event.message.chat_type,
            senderType: params.event.sender.sender_type,
            threadId: params.event.message.thread_id ?? null,
          }),
          createdAt,
        ],
      );
      const messageId = Number(result.insertId);
      await pool.execute(
        `
          UPDATE lb_chat_sessions
          SET last_message_id = ?, last_message_at = ?, updated_at = CURRENT_TIMESTAMP(3)
          WHERE id = ?
        `,
        [messageId || null, createdAt, sessionId],
      );
      return messageId ? { sessionId, messageId } : { sessionId, messageId: 0 };
    } catch (err) {
      warn(`memory mysql: failed to record user message: ${redactError(err)}`);
      return null;
    }
  }

  async recordAssistantMessage(params: {
    accountId: string;
    event: FeishuMessageEvent;
    sessionKey: string;
    content: string;
    aiTurnId?: number;
    chunkCount: number;
  }): Promise<DbMessageRef | null> {
    try {
      const createdAt = new Date();
      const sessionId =
        params.aiTurnId !== undefined
          ? await this.upsertSession({
              accountId: params.accountId,
              sessionKey: params.sessionKey,
              event: params.event,
              lastMessageAt: createdAt,
            })
          : await this.upsertSession({
              accountId: params.accountId,
              sessionKey: params.sessionKey,
              event: params.event,
              lastMessageAt: createdAt,
            });
      const pool = this.requirePool();
      const [result] = await pool.execute<ResultSetHeader>(
        `
          INSERT INTO lb_chat_messages (
            session_id, channel, account_id, external_message_id, reply_to_external_message_id,
            root_external_message_id, parent_external_message_id, role, message_type, sender_id,
            sender_name, content, content_sha256, mentioned_bot, should_reply, ai_turn_id,
            metadata, external_created_at
          ) VALUES (?, 'feishu', ?, NULL, ?, ?, ?, 'assistant', 'post', NULL, '小橘', ?, ?, 0, NULL, ?, ?, ?)
        `,
        [
          sessionId,
          params.accountId,
          params.event.message.message_id,
          params.event.message.root_id ?? null,
          params.event.message.parent_id ?? null,
          params.content,
          sha256Hex(params.content),
          params.aiTurnId ?? null,
          jsonForDb({ chunkCount: params.chunkCount }),
          createdAt,
        ],
      );
      const messageId = Number(result.insertId);
      await pool.execute(
        `
          UPDATE lb_chat_sessions
          SET last_message_id = ?, last_message_at = ?, last_assistant_message_at = ?, updated_at = CURRENT_TIMESTAMP(3)
          WHERE id = ?
        `,
        [messageId || null, createdAt, createdAt, sessionId],
      );
      return messageId ? { sessionId, messageId } : { sessionId, messageId: 0 };
    } catch (err) {
      warn(`memory mysql: failed to record assistant message: ${redactError(err)}`);
      return null;
    }
  }

  async startAiTurn(params: {
    sessionId: number;
    triggerMessageId?: number;
    model: string;
    fallbackModel?: string;
    inputMessageCount: number;
  }): Promise<number | undefined> {
    try {
      const [result] = await this.requirePool().execute<ResultSetHeader>(
        `
          INSERT INTO lb_ai_turns (
            session_id, trigger_message_id, status, model, fallback_model, input_message_count, started_at
          ) VALUES (?, ?, 'running', ?, ?, ?, CURRENT_TIMESTAMP(3))
        `,
        [
          params.sessionId,
          params.triggerMessageId && params.triggerMessageId > 0 ? params.triggerMessageId : null,
          params.model,
          params.fallbackModel ?? null,
          params.inputMessageCount,
        ],
      );
      return Number(result.insertId) || undefined;
    } catch (err) {
      warn(`memory mysql: failed to start ai turn: ${redactError(err)}`);
      return undefined;
    }
  }

  async finishAiTurn(params: {
    aiTurnId?: number;
    status: "success" | "failed";
    toolRounds: number;
    errorMessage?: string;
  }): Promise<void> {
    if (!params.aiTurnId) {
      return;
    }
    try {
      await this.requirePool().execute(
        `
          UPDATE lb_ai_turns
          SET status = ?, tool_rounds = ?, finished_at = CURRENT_TIMESTAMP(3), error_message = ?
          WHERE id = ?
        `,
        [
          params.status,
          params.toolRounds,
          params.errorMessage ? truncateForDb(params.errorMessage, 4_000) : null,
          params.aiTurnId,
        ],
      );
    } catch (err) {
      warn(`memory mysql: failed to finish ai turn: ${redactError(err)}`);
    }
  }

  async recordToolCall(params: {
    aiTurnId?: number;
    toolCallId?: string;
    serverName: string;
    toolName: string;
    openAiToolName: string;
    args: JsonRecord;
    status: "success" | "failed";
    attempts: number;
    timeoutMs: number;
    startedAt: Date;
    durationMs: number;
    resultPreview?: string;
    errorMessage?: string;
  }): Promise<void> {
    if (!params.aiTurnId) {
      return;
    }
    try {
      await this.requirePool().execute(
        `
          INSERT INTO lb_tool_calls (
            ai_turn_id, tool_call_id, server_name, tool_name, openai_tool_name,
            arguments_json, result_preview, status, attempts, timeout_ms, started_at,
            finished_at, duration_ms, error_message
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), ?, ?)
        `,
        [
          params.aiTurnId,
          params.toolCallId ?? null,
          params.serverName,
          params.toolName,
          params.openAiToolName,
          jsonForDb(params.args),
          params.resultPreview ? truncateForDb(params.resultPreview) : null,
          params.status,
          params.attempts,
          params.timeoutMs,
          params.startedAt,
          params.durationMs,
          params.errorMessage ? truncateForDb(params.errorMessage, 4_000) : null,
        ],
      );
    } catch (err) {
      warn(`memory mysql: failed to record tool call: ${redactError(err)}`);
    }
  }

  private async refreshContextDocuments(): Promise<void> {
    try {
      const [rows] = await this.requirePool().execute<RowDataPacket[]>(
        `
          SELECT name, doc_type, title, content
          FROM lb_context_documents
          WHERE status = 'active'
            AND injection_mode IN ('always', 'feishu')
          ORDER BY priority ASC, updated_at DESC, id ASC
        `,
      );
      const documents = rows
        .map((row): ContextDocument | null => {
          const name = readString(row.name);
          const content = typeof row.content === "string" ? row.content : "";
          if (!name || !content.trim()) {
            return null;
          }
          return {
            name,
            docType: readString(row.doc_type) ?? "note",
            title: readString(row.title),
            content,
          };
        })
        .filter((doc): doc is ContextDocument => doc !== null);
      this.contextDocumentsPrompt = buildContextDocumentsPrompt(documents);
      this.contextDocumentsLoadedAt = Date.now();
      if (documents.length > 0) {
        log(`memory mysql: loaded ${documents.length} context document(s)`);
      }
    } catch (err) {
      this.contextDocumentsPrompt = "";
      this.contextDocumentsLoadedAt = Date.now();
      warn(`memory mysql: failed to load context documents: ${redactError(err)}`);
    }
  }

  private requirePool(): Pool {
    if (!this.pool) {
      throw new Error("mysql memory pool is not initialized");
    }
    return this.pool;
  }

  private async upsertSession(params: {
    accountId: string;
    sessionKey: string;
    event: FeishuMessageEvent;
    lastMessageAt?: Date;
  }): Promise<number> {
    const cached = this.sessionIds.get(params.sessionKey);
    if (cached) {
      return cached;
    }
    const threadId = params.event.message.root_id || params.event.message.thread_id || null;
    const [result] = await this.requirePool().execute<ResultSetHeader>(
      `
        INSERT INTO lb_chat_sessions (
          session_key, channel, account_id, session_type, chat_id, thread_id,
          sender_scope_id, title, last_message_at
        ) VALUES (?, 'feishu', ?, ?, ?, ?, NULL, NULL, ?)
        ON DUPLICATE KEY UPDATE
          id = LAST_INSERT_ID(id),
          account_id = VALUES(account_id),
          session_type = VALUES(session_type),
          chat_id = VALUES(chat_id),
          thread_id = VALUES(thread_id),
          last_message_at = COALESCE(VALUES(last_message_at), last_message_at),
          updated_at = CURRENT_TIMESTAMP(3)
      `,
      [
        params.sessionKey,
        params.accountId,
        sessionTypeFor(params.event),
        params.event.message.chat_id,
        threadId,
        params.lastMessageAt ?? null,
      ],
    );
    let sessionId = Number(result.insertId);
    if (!sessionId) {
      const [rows] = await this.requirePool().execute<RowDataPacket[]>(
        "SELECT id FROM lb_chat_sessions WHERE session_key = ? LIMIT 1",
        [params.sessionKey],
      );
      sessionId = Number(rows[0]?.id);
    }
    if (!sessionId) {
      throw new Error(`failed to resolve mysql session id for ${params.sessionKey}`);
    }
    this.sessionIds.set(params.sessionKey, sessionId);
    return sessionId;
  }
}

async function initializeMemoryStore(config: ServiceConfig): Promise<MysqlMemoryStore | null> {
  const mysqlConfig = resolveMysqlMemoryConfig(config);
  if (!mysqlConfig) {
    return null;
  }
  const store = new MysqlMemoryStore(mysqlConfig);
  try {
    await store.initialize();
    await store.restoreRecentConversations();
    return store;
  } catch (err) {
    warn(`memory mysql: unavailable, continuing with file state: ${redactError(err)}`);
    await store.close().catch(() => undefined);
    return null;
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
  conversations.set(key, entries);
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

function buildSystemPrompt(config: ServiceConfig, contextDocumentsPrompt = ""): string {
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
    contextDocumentsPrompt,
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
  memory?: MysqlMemoryStore | null;
  aiTurnId?: number;
}): Promise<GenerateReplyResult> {
  const apiKey = resolveZaiApiKey(params.config);
  if (!apiKey) {
    return { text: "ZAI API Key 没有配置，暂时无法回复。", toolRounds: 0 };
  }
  const tools = await params.mcp.openAiTools();
  const contextDocumentsPrompt = (await params.memory?.getContextDocumentsPrompt()) ?? "";
  const history = conversations.get(params.sessionKey) ?? [];
  const lastHistoryEntry = history.at(-1);
  const historyAlreadyIncludesCurrent =
    lastHistoryEntry?.role === "user" &&
    lastHistoryEntry.name === params.sender &&
    lastHistoryEntry.content === params.text;
  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(params.config, contextDocumentsPrompt) },
    ...history.map((entry): ChatMessage => ({
      role: entry.role,
      content: `${entry.name ? `${entry.name}: ` : ""}${entry.content}`,
    })),
    ...(historyAlreadyIncludesCurrent
      ? []
      : [{ role: "user" as const, content: `${params.sender}: ${params.text}` }]),
  ];

  let toolRounds = 0;
  for (;;) {
    const response = await callZaiChat({
      config: params.config,
      apiKey,
      messages,
      tools,
      timeoutMs: MODEL_TIMEOUT_MS,
    });
    if (response.toolCalls.length === 0) {
      return { text: response.content.trim() || "我这边没有生成有效回复。", toolRounds };
    }
    if (toolRounds >= MAX_TOOL_ROUNDS) {
      return { text: `MCP 工具调用超过 ${MAX_TOOL_ROUNDS} 轮，我先停在这里。`, toolRounds };
    }
    toolRounds += 1;
    messages.push({
      role: "assistant",
      content: response.content || null,
      tool_calls: response.toolCalls,
    });
    for (const toolCall of response.toolCalls) {
      const name = toolCall.function?.name ?? "";
      const argsText = toolCall.function?.arguments ?? "{}";
      const result = await params.mcp.callOpenAiTool(name, safeJsonParse(argsText), {
        memory: params.memory,
        aiTurnId: params.aiTurnId,
        toolCallId: toolCall.id,
      });
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id ?? name,
        content: result,
      });
    }
  }
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
  };
  if (typeof params.maxTokens === "number") {
    body.max_tokens = params.maxTokens;
  }
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
  private readonly clients = new Map<string, { client: McpClient; transport: Transport; config: McpServerConfig }>();
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

  async callOpenAiTool(openAiName: string, args: JsonRecord, trace?: ToolCallTrace): Promise<string> {
    await this.ensureInitialized();
    const binding = this.bindings.get(openAiName);
    if (!binding) {
      return `Tool ${openAiName} is not available.`;
    }
    const entry = this.clients.get(binding.serverName);
    if (!entry) {
      return `MCP server ${binding.serverName} is not connected.`;
    }
    const timeoutMs = readPositiveInteger(entry.config.toolTimeoutMs) ?? MCP_TOOL_TIMEOUT_MS;
    const maxAttempts = readPositiveInteger(entry.config.toolAttempts) ?? MCP_TOOL_MAX_ATTEMPTS;
    const startedAt = new Date();
    let lastError: unknown;
    let attemptsUsed = 0;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      attemptsUsed = attempt;
      try {
        const result = await entry.client.callTool(
          { name: binding.toolName, arguments: args },
          undefined,
          {
            timeout: timeoutMs,
            resetTimeoutOnProgress: true,
            maxTotalTimeout: timeoutMs,
          },
        );
        const text = formatMcpToolResult(result);
        await trace?.memory?.recordToolCall({
          aiTurnId: trace.aiTurnId,
          toolCallId: trace.toolCallId,
          serverName: binding.serverName,
          toolName: binding.toolName,
          openAiToolName: openAiName,
          args,
          status: "success",
          attempts: attemptsUsed,
          timeoutMs,
          startedAt,
          durationMs: Date.now() - startedAt.getTime(),
          resultPreview: text,
        });
        return text;
      } catch (err) {
        lastError = err;
        if (attempt >= maxAttempts) {
          break;
        }
        warn(
          `mcp tool ${openAiName} attempt ${attempt}/${maxAttempts} failed: ${redactError(err)}; retrying`,
        );
        await sleep(Math.min(MCP_TOOL_RETRY_BASE_DELAY_MS * attempt, 3_000));
      }
    }
    const failure = `MCP tool ${openAiName} failed after ${maxAttempts} attempt(s): ${redactError(lastError)}`;
    await trace?.memory?.recordToolCall({
      aiTurnId: trace.aiTurnId,
      toolCallId: trace.toolCallId,
      serverName: binding.serverName,
      toolName: binding.toolName,
      openAiToolName: openAiName,
      args,
      status: "failed",
      attempts: attemptsUsed || maxAttempts,
      timeoutMs,
      startedAt,
      durationMs: Date.now() - startedAt.getTime(),
      errorMessage: failure,
    });
    return failure;
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
        this.clients.set(serverName, { client, transport, config: serverConfig });
        const listed = await client.listTools(undefined, { timeout: MCP_CONNECT_TIMEOUT_MS });
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
    const serialized = typeof result === "string" ? result : JSON.stringify(result);
    return typeof serialized === "string" ? serialized : String(result);
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
  return text;
}

async function handleMessage(params: {
  config: ServiceConfig;
  account: ResolvedFeishuAccount;
  mcp: McpHub;
  memory?: MysqlMemoryStore | null;
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
    let shouldReply = true;
    if (event.message.chat_type === "group") {
      shouldReply = await shouldReplyToGroup({
        config,
        text,
        sessionKey: key,
        mentioned,
      });
    }
    const userMessageRef = await params.memory?.recordUserMessage({
      accountId: account.accountId,
      event,
      sessionKey: key,
      content: text,
      senderName: senderLabel(event),
      mentionedBot: mentioned,
      shouldReply,
    });
    if (event.message.chat_type === "group") {
      if (!shouldReply) {
        addHistory(key, { role: "user", name: senderLabel(event), content: text, ts: Date.now() });
        processedMessages.add(messageId);
        return;
      }
    }

    addHistory(key, { role: "user", name: senderLabel(event), content: text, ts: Date.now() });
    const aiTurnId = userMessageRef
      ? await params.memory?.startAiTurn({
          sessionId: userMessageRef.sessionId,
          triggerMessageId: userMessageRef.messageId,
          model: resolveModelId(config),
          fallbackModel: resolveModelId(config, 1),
          inputMessageCount: conversations.get(key)?.length ?? 0,
        })
      : undefined;
    let replyResult: GenerateReplyResult;
    try {
      replyResult = await generateReply({
        config,
        mcp: params.mcp,
        sessionKey: key,
        text,
        sender: senderLabel(event),
        memory: params.memory,
        aiTurnId,
      });
      await params.memory?.finishAiTurn({
        aiTurnId,
        status: "success",
        toolRounds: replyResult.toolRounds,
      });
    } catch (err) {
      await params.memory?.finishAiTurn({
        aiTurnId,
        status: "failed",
        toolRounds: 0,
        errorMessage: redactError(err),
      });
      throw err;
    }
    const reply = replyResult.text;
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
    await params.memory?.recordAssistantMessage({
      accountId: account.accountId,
      event,
      sessionKey: key,
      content: reply,
      aiTurnId,
      chunkCount: chunks.length,
    });
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

async function runFeishuService(
  config: ServiceConfig,
  abortSignal: AbortSignal,
  memory: MysqlMemoryStore | null,
): Promise<void> {
  const account = resolveAccountConfig(config);
  const client = createFeishuClient(account);
  const identity = await fetchBotIdentity(account).catch((err) => {
    warn(`Feishu bot identity probe failed: ${redactError(err)}`);
    return {};
  });
  log(`feishu[${account.accountId}]: bot open_id resolved: ${identity.botOpenId ? "[ok]" : "unknown"}`);

  const mcp = new McpHub(config);
  await mcp.openAiTools();
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
        memory,
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
    await memory?.close();
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
  const memory = await initializeMemoryStore(config);
  log(`starting minimal Feishu service, booted at ${serviceStart.toISOString()}`);
  const abortSignal = createAbortSignal();
  await runFeishuService(config, abortSignal, memory);
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
