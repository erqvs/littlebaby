# LittleBaby

LittleBaby 是一个面向飞书群聊的 AI 助手服务。当前部署形态是极简 Feishu-only 运行链路：通过飞书长连接接收消息，使用 ZAI 生成回复，并按需调用 MCP 工具完成查资料、读网页、查课程、记账等动作。

本项目不提供公开网站、浏览器管理 UI 或 HTTP Gateway。systemd 中保留的 `--bind`、`--port` 参数只用于兼容旧启动命令，生产入口不会开放 HTTP 监听。

## 当前范围

- 飞书消息接收与发送
- 群聊触发判断与会话路由
- ZAI 主模型调用与 fallback 配置读取
- MCP 工具连接与 OpenAI-compatible tool call 转接
- 长回复分段发送
- 本地会话历史与去重状态保存

不在当前范围：

- 浏览器 Control UI
- canvas / A2UI
- setup / onboard / configure 引导入口
- 旧通道和通用 agent runtime 的生产启动链路

## 技术栈

| 组件 | 技术 |
| --- | --- |
| 运行时 | Node.js 22+ |
| 包管理 | pnpm 10 |
| 构建 | TypeScript + tsdown |
| 飞书接入 | `@larksuiteoapi/node-sdk` WebSocket |
| MCP | `@modelcontextprotocol/sdk` |
| 记忆存储 | MySQL 8.0 + `mysql2` |
| 配置解析 | JSON5 |
| 参数校验 | Zod |
| 进程管理 | systemd: `littlebaby.service` |

## 目录结构

```text
littlebaby/
├── dist-service/          # 生产构建产物，只输出 feishu-service.js
├── extensions/feishu/     # 飞书通道相关源码
├── extensions/zai/        # ZAI 模型提供方相关源码
├── scripts/
│   ├── build-feishu-service.mjs
│   ├── import-context-documents.mjs
│   ├── migrate-memory-db.mjs
│   ├── sql/001-memory-schema.sql
│   ├── sql/002-context-documents.sql
│   └── mcp/terminal-littlebaby-api-server.mjs
├── src/
│   ├── feishu-service.ts  # 当前 systemd 生产入口
│   └── auto-reply/        # 回复分发与规则链路
├── docs/
│   └── mysql-memory-schema.md
├── package.json
├── pnpm-lock.yaml
└── PROJECT.md
```

## 配置

生产配置位于运行用户家目录：

```text
/home/user/.littlebaby/littlebaby.json
```

常用环境变量：

| 变量 | 说明 |
| --- | --- |
| `HOME` | 服务用户家目录，生产中通常是 `/home/user` |
| `LITTLEBABY_STATE_DIR` | 状态目录，默认 `$HOME/.littlebaby` |
| `LITTLEBABY_CONFIG_PATH` | 显式指定配置文件路径 |
| `NODE_ENV` | 运行环境 |

配置文件中会包含飞书、ZAI、MCP、MySQL 或关联服务的密钥。不要把密钥写入 README、PROJECT.md、提交信息、日志或临时排查文档。

MySQL 记忆配置位于：

```text
memory.mysql
```

当前生产服务连接共享 MySQL 的 `littlebaby` 库，用于保存聊天流水、AI 回合、MCP 工具调用和后续长期记忆。表结构见 [docs/mysql-memory-schema.md](docs/mysql-memory-schema.md)。

长期上下文文档也存放在 MySQL：

```text
lb_context_documents
```

当前已导入 `AGENTS.md`、`USER.md`、`MEMORY.md`、`SOUL.md`、`IDENTITY.md`、`HEARTBEAT.md`、`TOOLS.md`。服务启动后会加载 active 文档并注入系统提示词，用于小橘人格、身份、用户偏好、长期记忆和工具约定。

## 开发

安装依赖：

```bash
pnpm install
```

构建生产入口：

```bash
pnpm build
```

迁移记忆数据库：

```bash
HOME=/home/user LITTLEBABY_STATE_DIR=/home/user/.littlebaby pnpm db:migrate
```

导入长期上下文文档：

```bash
HOME=/home/user LITTLEBABY_STATE_DIR=/home/user/.littlebaby pnpm context:import
```

查看入口帮助：

```bash
node dist-service/feishu-service.js --help
```

本地按当前环境配置启动：

```bash
pnpm start
```

`pnpm build` 会执行 `scripts/build-feishu-service.mjs`，清理并重新生成 `dist-service/feishu-service.js`。

## 生产运维

启动服务：

```bash
sudo systemctl start littlebaby.service
```

停止服务：

```bash
sudo systemctl stop littlebaby.service
```

重启服务：

```bash
sudo systemctl restart littlebaby.service
```

查看日志：

```bash
sudo journalctl -u littlebaby.service -f
```

典型更新流程：

```bash
cd /path/to/project
pnpm install --frozen-lockfile
pnpm build
node dist-service/feishu-service.js --help
sudo systemctl restart littlebaby.service
```

## 运行链路

1. `littlebaby.service` 启动 `dist-service/feishu-service.js`。
2. 服务读取 JSON5 配置和本地状态文件。
3. 如果配置了 `memory.mysql`，连接 MySQL，恢复最近会话上下文，并加载长期上下文文档。
4. 通过飞书 WebSocket 接收事件。
5. 消息进入去重、权限、群聊触发判断，并写入 MySQL 原始消息流水。
6. 需要回复时，构造系统提示词、长期上下文文档和近期会话历史。
7. 调用 ZAI chat completions，并记录 AI 回合状态。
8. 如果模型请求工具，服务连接 MCP server 并转发 tool call，同时记录工具调用。
9. 生成最终回复后，通过飞书消息接口发送；长文本按配置分段。
10. 保存会话历史和消息去重状态。

## MCP

当前生产配置可接入多个 MCP server。服务会在首次需要工具列表时初始化 MCP 连接，并把 MCP tool 映射成模型可调用的 function tools。

常见工具来源包括：

- ZAI MCP server
- zread
- terminal-littlebaby
- web search
- web reader

MCP 命令输出和错误日志需要避免暴露 key、token、secret、Authorization 等敏感字段。

## 状态文件

服务会在 MySQL 中维护持久聊天记忆，并在状态目录下保留轻量运行状态：

| 位置 | 说明 |
| --- | --- |
| MySQL `littlebaby.lb_chat_messages` | 原始聊天流水 |
| MySQL `littlebaby.lb_ai_turns` | AI 回复回合 |
| MySQL `littlebaby.lb_tool_calls` | MCP 工具调用追踪 |
| MySQL `littlebaby.lb_context_documents` | 小橘人格、身份、用户偏好、长期记忆和工具约定 |
| `lite-history.json` | 最近会话历史 |
| `lite-dedupe.json` | 已处理消息 ID 去重集合 |

MySQL 是当前记忆系统的主存储；本地 JSON 文件仍用于回滚兜底和重复消息保护，不应提交到仓库。

## 排查

配置缺失：

```bash
node dist-service/feishu-service.js --help
```

如果 help 正常但 systemd 启动失败，优先看：

```bash
sudo journalctl -u littlebaby.service -n 200 --no-pager
```

MCP 工具不可用时，检查：

- 配置中的 MCP server 是否启用
- `command`、`args`、`cwd`、`env` 是否正确
- 关联服务是否在线
- 日志中是否有连接超时或鉴权失败

飞书无回复时，检查：

- 飞书长连接是否启动成功
- 群聊 allowlist / denylist 配置
- 机器人是否被提及或分类器是否判断需要回复
- ZAI API Key 是否可用
- 是否命中了消息去重

## 开发约定

- 保持生产入口聚焦在 `src/feishu-service.ts`。
- 不恢复浏览器 UI、旧通道或通用 runtime 到生产构建链路，除非明确重新设计部署形态。
- 新增依赖前先确认是否是生产入口实际需要。
- 修改配置、部署方式或运行命令后，同步更新 `PROJECT.md`。
- 不在仓库文档中复制密钥、Token、App Secret、API Key 或内网入口细节。
