#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import JSON5 from "json5";
import mysql from "mysql2/promise";

const defaultConfigFile = "littlebaby.json";
const defaultStateDir = ".littlebaby";

function readString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readPositiveInteger(value, fallback) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value.trim()) : NaN;
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function resolveUserPath(input) {
  if (input === "~") {
    return os.homedir();
  }
  if (input.startsWith("~/")) {
    return path.join(os.homedir(), input.slice(2));
  }
  return path.resolve(input);
}

function resolveStateDir() {
  const explicit = readString(process.env.LITTLEBABY_STATE_DIR);
  return explicit ? resolveUserPath(explicit) : path.join(os.homedir(), defaultStateDir);
}

function resolveConfigPath() {
  const explicit = readString(process.env.LITTLEBABY_CONFIG_PATH);
  return explicit ? resolveUserPath(explicit) : path.join(resolveStateDir(), defaultConfigFile);
}

function loadConfig() {
  const configPath = resolveConfigPath();
  if (!fs.existsSync(configPath)) {
    return {};
  }
  const parsed = JSON5.parse(fs.readFileSync(configPath, "utf8"));
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
}

function resolveMysqlConfig(config) {
  const configMysql = config.memory?.mysql ?? config.database?.mysql ?? config.mysql ?? {};
  return {
    host: readString(process.env.LITTLEBABY_MYSQL_HOST) ?? readString(configMysql.host) ?? "127.0.0.1",
    port: readPositiveInteger(process.env.LITTLEBABY_MYSQL_PORT ?? configMysql.port, 3306),
    user: readString(process.env.LITTLEBABY_MYSQL_USER) ?? readString(configMysql.user),
    password: readString(process.env.LITTLEBABY_MYSQL_PASSWORD) ?? readString(configMysql.password),
    database: readString(process.env.LITTLEBABY_MYSQL_DATABASE) ?? readString(configMysql.database) ?? "littlebaby",
  };
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function jsonForDb(value) {
  return JSON.stringify(value);
}

function firstExisting(paths) {
  return paths.find((candidate) => fs.existsSync(candidate));
}

function defaultDocumentSources() {
  const stateDir = resolveStateDir();
  const workspaceDir = path.join(stateDir, "workspace");
  const backupDir = path.join(stateDir, "backups", "workspace-context-20260425T180146Z");
  const fromWorkspaceOrBackup = (name) =>
    firstExisting([path.join(workspaceDir, name), path.join(backupDir, name)]);
  return [
    {
      name: "AGENTS.md",
      docType: "agent_rules",
      title: "Workspace operating rules",
      priority: 10,
      sourcePath: fromWorkspaceOrBackup("AGENTS.md"),
    },
    {
      name: "SOUL.md",
      docType: "persona",
      title: "小橘人格设定",
      priority: 20,
      sourcePath: fromWorkspaceOrBackup("SOUL.md"),
    },
    {
      name: "IDENTITY.md",
      docType: "identity",
      title: "小橘身份元信息",
      priority: 30,
      sourcePath: fromWorkspaceOrBackup("IDENTITY.md"),
    },
    {
      name: "USER.md",
      docType: "user_profile",
      title: "用户识别和偏好",
      priority: 40,
      sourcePath: fromWorkspaceOrBackup("USER.md"),
    },
    {
      name: "MEMORY.md",
      docType: "long_term_memory",
      title: "长期记忆",
      priority: 50,
      sourcePath: fromWorkspaceOrBackup("MEMORY.md"),
    },
    {
      name: "TOOLS.md",
      docType: "tool_notes",
      title: "工具使用笔记",
      priority: 60,
      sourcePath: fromWorkspaceOrBackup("TOOLS.md"),
    },
    {
      name: "HEARTBEAT.md",
      docType: "heartbeat",
      title: "心跳任务说明",
      priority: 90,
      sourcePath: fromWorkspaceOrBackup("HEARTBEAT.md"),
    },
  ].filter((source) => source.sourcePath);
}

async function main() {
  const config = loadConfig();
  const mysqlConfig = resolveMysqlConfig(config);
  if (!mysqlConfig.user || !mysqlConfig.password) {
    throw new Error("MySQL user/password is missing from config or LITTLEBABY_MYSQL_* environment variables");
  }
  const connection = await mysql.createConnection({
    host: mysqlConfig.host,
    port: mysqlConfig.port,
    user: mysqlConfig.user,
    password: mysqlConfig.password,
    database: mysqlConfig.database,
    charset: "utf8mb4",
  });
  const sources = defaultDocumentSources();
  try {
    for (const source of sources) {
      const content = fs.readFileSync(source.sourcePath, "utf8").trim();
      if (!content) {
        continue;
      }
      await connection.execute(
        `
          INSERT INTO lb_context_documents (
            scope_type, scope_key, name, doc_type, title, content, content_sha256,
            status, injection_mode, priority, source_path, metadata
          ) VALUES ('global', 'default', ?, ?, ?, ?, ?, 'active', 'always', ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            doc_type = VALUES(doc_type),
            title = VALUES(title),
            content = VALUES(content),
            content_sha256 = VALUES(content_sha256),
            status = 'active',
            injection_mode = VALUES(injection_mode),
            priority = VALUES(priority),
            source_path = VALUES(source_path),
            metadata = VALUES(metadata),
            updated_at = CURRENT_TIMESTAMP(3)
        `,
        [
          source.name,
          source.docType,
          source.title,
          content,
          sha256Hex(content),
          source.priority,
          source.sourcePath,
          jsonForDb({ importedAt: new Date().toISOString(), importer: "scripts/import-context-documents.mjs" }),
        ],
      );
    }
  } finally {
    await connection.end();
  }
  console.log(`Imported ${sources.length} context document(s) into ${mysqlConfig.database}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
