# LittleBaby

A personalized AI assistant for Feishu group chat, powered by [OpenClaw](https://github.com/openclaw/openclaw).

## What is this

LittleBaby is a fork of [OpenClaw](https://github.com/openclaw/openclaw) (v2026.4.20), customized as a Feishu group chat AI companion named "小橘" (Xiao Ju).

### Key customizations

- **Smart auto-reply** — No need to @mention. A two-stage shouldAutoReply system (glm-5-turbo fast filter + thinking mode confirmation) determines if the bot should respond.
- **Media-aware history** — Non-mentioned group messages with images/media are downloaded and stored in chat history, so the AI can "see" past shared media.
- **Bot reply in history** — The bot's own replies are captured and written into chat history, maintaining conversational context.
- **Group activation** — `groupActivation: always` enables the bot to proactively participate in group conversations.

## Architecture

```
/path/to/project/          # Source code (this repo)
/path/to/project/dist/     # Compiled output (pnpm build)
/home/openclaw-custom/.littlebaby/     # Runtime data (config, sessions, memory)
```

## Development

### Prerequisites

- Node.js 22+
- pnpm

### Build & Run

```bash
pnpm install
pnpm build
systemctl restart littlebaby
```

### Development loop

1. Edit TypeScript source in `extensions/feishu/src/`
2. Run `pnpm build`
3. Restart: `systemctl restart littlebaby`
4. Check logs: `journalctl -u littlebaby -f`

## Runtime

### Systemd service

```
# /etc/systemd/system/littlebaby.service
ExecStart=/usr/bin/node /path/to/project/littlebaby.mjs gateway --allow-unconfigured --bind loopback --port 28789
Environment=OPENCLAW_STATE_DIR=/home/openclaw-custom/.littlebaby
```

### Useful commands

```bash
# Check status
systemctl status littlebaby

# View logs
journalctl -u littlebaby -f

# Check Feishu WebSocket
journalctl -u littlebaby | grep "ws client ready"
```

## Configuration

- Main config: `~/.littlebaby/openclaw.json`
- Agent workspace: `~/.littlebaby/workspace/`
- Session data: `~/.littlebaby/agents/main/sessions/`
- Memory: `~/.littlebaby/memory/`

## License

MIT (inherited from OpenClaw)
