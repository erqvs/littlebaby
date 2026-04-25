# LittleDock <!-- omit in toc -->

Stop typing `docker-compose` commands. Just type `littledock-start`.

Inspired by Simon Willison's [Running LittleBaby in Docker](https://til.simonwillison.net/llms/littlebaby-docker).

- [Quickstart](#quickstart)
- [Available Commands](#available-commands)
  - [Basic Operations](#basic-operations)
  - [Container Access](#container-access)
  - [Web UI \& Devices](#web-ui--devices)
  - [Setup \& Configuration](#setup--configuration)
  - [Maintenance](#maintenance)
  - [Utilities](#utilities)
- [Configuration \& Secrets](#configuration--secrets)
  - [Docker Files](#docker-files)
  - [Config Files](#config-files)
  - [Initial Setup](#initial-setup)
  - [How It Works in Docker](#how-it-works-in-docker)
  - [Env Precedence](#env-precedence)
- [Common Workflows](#common-workflows)
  - [Check Status and Logs](#check-status-and-logs)
  - [Set Up WhatsApp Bot](#set-up-whatsapp-bot)
  - [Troubleshooting Device Pairing](#troubleshooting-device-pairing)
  - [Fix Token Mismatch Issues](#fix-token-mismatch-issues)
  - [Permission Denied](#permission-denied)
- [Requirements](#requirements)
- [Development](#development)

## Quickstart

**Install:**

```bash
mkdir -p ~/.littledock && curl -sL https://raw.githubusercontent.com/littlebaby/littlebaby/main/scripts/littledock/littledock-helpers.sh -o ~/.littledock/littledock-helpers.sh
```

```bash
echo 'source ~/.littledock/littledock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

Canonical docs page: https://docs.littlebaby.ai/install/littledock

If you previously installed LittleDock from `scripts/shell-helpers/littledock-helpers.sh`, rerun the install command above. The old raw GitHub path has been removed.

**See what you get:**

```bash
littledock-help
```

On first command, LittleDock auto-detects your LittleBaby directory:

- Checks common paths (`~/littlebaby`, `~/workspace/littlebaby`, etc.)
- If found, asks you to confirm
- Saves to `~/.littledock/config`

**First time setup:**

```bash
littledock-start
```

```bash
littledock-fix-token
```

```bash
littledock-dashboard
```

If you see "pairing required":

```bash
littledock-devices
```

And approve the request for the specific device:

```bash
littledock-approve <request-id>
```

## Available Commands

### Basic Operations

| Command            | Description                     |
| ------------------ | ------------------------------- |
| `littledock-start`   | Start the gateway               |
| `littledock-stop`    | Stop the gateway                |
| `littledock-restart` | Restart the gateway             |
| `littledock-status`  | Check container status          |
| `littledock-logs`    | View live logs (follows output) |

### Container Access

| Command                   | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `littledock-shell`          | Interactive shell inside the gateway container |
| `littledock-cli <command>`  | Run LittleBaby CLI commands                      |
| `littledock-exec <command>` | Execute arbitrary commands in the container    |

### Web UI & Devices

| Command                 | Description                                |
| ----------------------- | ------------------------------------------ |
| `littledock-dashboard`    | Open web UI in browser with authentication |
| `littledock-devices`      | List device pairing requests               |
| `littledock-approve <id>` | Approve a device pairing request           |

### Setup & Configuration

| Command              | Description                                       |
| -------------------- | ------------------------------------------------- |
| `littledock-fix-token` | Configure gateway authentication token (run once) |

### Maintenance

| Command            | Description                                           |
| ------------------ | ----------------------------------------------------- |
| `littledock-update`  | Pull latest, rebuild image, and restart (one command) |
| `littledock-rebuild` | Rebuild the Docker image only                         |
| `littledock-clean`   | Remove all containers and volumes (destructive!)      |

### Utilities

| Command                | Description                               |
| ---------------------- | ----------------------------------------- |
| `littledock-health`      | Run gateway health check                  |
| `littledock-token`       | Display the gateway authentication token  |
| `littledock-cd`          | Jump to the LittleBaby project directory    |
| `littledock-config`      | Open the LittleBaby config directory        |
| `littledock-show-config` | Print config files with redacted values   |
| `littledock-workspace`   | Open the workspace directory              |
| `littledock-help`        | Show all available commands with examples |

## Configuration & Secrets

The Docker setup uses three config files on the host. The container never stores secrets — everything is bind-mounted from local files.

### Docker Files

| File                       | Purpose                                                                    |
| -------------------------- | -------------------------------------------------------------------------- |
| `Dockerfile`               | Builds the `littlebaby:local` image (Node 22, pnpm, non-root `node` user)    |
| `docker-compose.yml`       | Defines `littlebaby-gateway` and `littlebaby-cli` services, bind-mounts, ports |
| `docker-setup.sh`          | First-time setup — builds image, creates `.env` from `.env.example`        |
| `.env.example`             | Template for `<project>/.env` with all supported vars and docs             |
| `docker-compose.extra.yml` | Optional overrides — auto-loaded by LittleDock helpers if present            |

### Config Files

| File                        | Purpose                                          | Examples                                                            |
| --------------------------- | ------------------------------------------------ | ------------------------------------------------------------------- |
| `<project>/.env`            | **Docker infra** — image, ports, gateway token   | `LITTLEBABY_GATEWAY_TOKEN`, `LITTLEBABY_IMAGE`, `LITTLEBABY_GATEWAY_PORT` |
| `~/.littlebaby/.env`          | **Secrets** — API keys and bot tokens            | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`         |
| `~/.littlebaby/littlebaby.json` | **Behavior config** — models, channels, policies | Model selection, WhatsApp allowlists, agent settings                |

**Do NOT** put API keys or bot tokens in `littlebaby.json`. Use `~/.littlebaby/.env` for all secrets.

### Initial Setup

`./docker-setup.sh` (in the project root) handles first-time Docker configuration:

- Builds the `littlebaby:local` image from `Dockerfile`
- Creates `<project>/.env` from `.env.example` with a generated gateway token
- Sets up `~/.littlebaby` directories if they don't exist

```bash
./docker-setup.sh
```

After setup, add your API keys:

```bash
vim ~/.littlebaby/.env
```

See `.env.example` for all supported keys.

The `Dockerfile` supports two optional build args:

- `LITTLEBABY_DOCKER_APT_PACKAGES` — extra apt packages to install (e.g. `ffmpeg`)
- `LITTLEBABY_INSTALL_BROWSER=1` — pre-install Chromium for browser automation (adds ~300MB, but skips the 60-90s Playwright install on each container start)

### How It Works in Docker

`docker-compose.yml` bind-mounts both config and workspace from the host:

```yaml
volumes:
  - ${LITTLEBABY_CONFIG_DIR}:/home/node/.littlebaby
  - ${LITTLEBABY_WORKSPACE_DIR}:/home/node/.littlebaby/workspace
```

This means:

- `~/.littlebaby/.env` is available inside the container at `/home/node/.littlebaby/.env` — LittleBaby loads it automatically as the global env fallback
- `~/.littlebaby/littlebaby.json` is available at `/home/node/.littlebaby/littlebaby.json` — the gateway watches it and hot-reloads most changes
- No need to add API keys to `docker-compose.yml` or configure anything inside the container
- Keys survive `littledock-update`, `littledock-rebuild`, and `littledock-clean` because they live on the host

The project `.env` feeds Docker Compose directly (gateway token, image name, ports). The `~/.littlebaby/.env` feeds the LittleBaby process inside the container.

### Example `~/.littlebaby/.env`

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
TELEGRAM_BOT_TOKEN=123456:ABCDEF...
```

### Example `<project>/.env`

```bash
LITTLEBABY_CONFIG_DIR=/Users/you/.littlebaby
LITTLEBABY_WORKSPACE_DIR=/Users/you/.littlebaby/workspace
LITTLEBABY_GATEWAY_PORT=18789
LITTLEBABY_BRIDGE_PORT=18790
LITTLEBABY_GATEWAY_BIND=lan
LITTLEBABY_GATEWAY_TOKEN=<generated-by-docker-setup>
LITTLEBABY_IMAGE=littlebaby:local
```

### Env Precedence

LittleBaby loads env vars in this order (highest wins, never overrides existing):

1. **Process environment** — `docker-compose.yml` `environment:` block (gateway token, session keys)
2. **`.env` in CWD** — project root `.env` (Docker infra vars)
3. **`~/.littlebaby/.env`** — global secrets (API keys, bot tokens)
4. **`littlebaby.json` `env` block** — inline vars, applied only if still missing
5. **Shell env import** — optional login-shell scrape (`LITTLEBABY_LOAD_SHELL_ENV=1`)

## Common Workflows

### Update LittleBaby

> **Important:** `littlebaby update` does not work inside Docker.
> The container runs as a non-root user with a source-built image, so `npm i -g` fails with EACCES.
> Use `littledock-update` instead — it pulls, rebuilds, and restarts from the host.

```bash
littledock-update
```

This runs `git pull` → `docker compose build` → `docker compose down/up` in one step.

If you only want to rebuild without pulling:

```bash
littledock-rebuild && littledock-stop && littledock-start
```

### Check Status and Logs

**Restart the gateway:**

```bash
littledock-restart
```

**Check container status:**

```bash
littledock-status
```

**View live logs:**

```bash
littledock-logs
```

### Set Up WhatsApp Bot

**Shell into the container:**

```bash
littledock-shell
```

**Inside the container, login to WhatsApp:**

```bash
littlebaby channels login --channel whatsapp --verbose
```

Scan the QR code with WhatsApp on your phone.

**Verify connection:**

```bash
littlebaby status
```

### Troubleshooting Device Pairing

**Check for pending pairing requests:**

```bash
littledock-devices
```

**Copy the Request ID from the "Pending" table, then approve:**

```bash
littledock-approve <request-id>
```

Then refresh your browser.

### Fix Token Mismatch Issues

If you see "gateway token mismatch" errors:

```bash
littledock-fix-token
```

This will:

1. Read the token from your `.env` file
2. Configure it in the LittleBaby config
3. Restart the gateway
4. Verify the configuration

### Permission Denied

**Ensure Docker is running and you have permission:**

```bash
docker ps
```

## Requirements

- Docker and Docker Compose installed
- Bash or Zsh shell
- LittleBaby project (run `scripts/docker/setup.sh`)

## Development

**Test with fresh config (mimics first-time install):**

```bash
unset CLAWDOCK_DIR && rm -f ~/.littledock/config && source scripts/littledock/littledock-helpers.sh
```

Then run any command to trigger auto-detect:

```bash
littledock-start
```
