#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import JSON5 from "json5";
import mysql from "mysql2/promise";

const rootDir = process.cwd();
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
  const configMysql =
    config.memory?.mysql ??
    config.database?.mysql ??
    config.mysql ??
    {};
  return {
    host: readString(process.env.LITTLEBABY_MYSQL_HOST) ?? readString(configMysql.host) ?? "127.0.0.1",
    port: readPositiveInteger(process.env.LITTLEBABY_MYSQL_PORT ?? configMysql.port, 3306),
    user: readString(process.env.LITTLEBABY_MYSQL_USER) ?? readString(configMysql.user),
    password: readString(process.env.LITTLEBABY_MYSQL_PASSWORD) ?? readString(configMysql.password),
    database: readString(process.env.LITTLEBABY_MYSQL_DATABASE) ?? readString(configMysql.database) ?? "littlebaby",
  };
}

function splitSqlStatements(sql) {
  return sql
    .split(/;\s*(?:\n|$)/g)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function readMigrationStatements() {
  const sqlDir = path.join(rootDir, "scripts", "sql");
  return fs
    .readdirSync(sqlDir)
    .filter((name) => /^\d+-.+\.sql$/u.test(name))
    .sort((a, b) => a.localeCompare(b))
    .flatMap((name) => {
      const sqlPath = path.join(sqlDir, name);
      return splitSqlStatements(fs.readFileSync(sqlPath, "utf8")).map((statement) => ({
        name,
        statement,
      }));
    });
}

async function main() {
  const config = loadConfig();
  const mysqlConfig = resolveMysqlConfig(config);
  if (!mysqlConfig.user || !mysqlConfig.password) {
    throw new Error("MySQL user/password is missing from config or LITTLEBABY_MYSQL_* environment variables");
  }
  const statements = readMigrationStatements();
  const connection = await mysql.createConnection({
    host: mysqlConfig.host,
    port: mysqlConfig.port,
    user: mysqlConfig.user,
    password: mysqlConfig.password,
    database: mysqlConfig.database,
    charset: "utf8mb4",
    namedPlaceholders: false,
  });
  try {
    for (const { statement } of statements) {
      await connection.query(statement);
    }
  } finally {
    await connection.end();
  }
  console.log(`Applied ${statements.length} memory schema statement(s) to ${mysqlConfig.database}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
