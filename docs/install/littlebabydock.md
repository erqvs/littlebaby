---
summary: "LittleBabyDock shell helpers for Docker-based LittleBaby installs"
read_when:
  - You run LittleBaby with Docker often and want shorter day-to-day commands
  - You want a helper layer for dashboard, logs, token setup, and pairing flows
title: "LittleBabyDock"
---

# LittleBabyDock

LittleBabyDock is a small shell-helper layer for Docker-based LittleBaby installs.

It gives you short commands like `littlebabyock-start`, `littlebabyock-dashboard`, and `littlebabyock-fix-token` instead of longer `docker compose ...` invocations.

If you have not set up Docker yet, start with [Docker](/install/docker).

## Install

Use the canonical helper path:

```bash
mkdir -p ~/.littlebabyock && curl -sL https://raw.githubusercontent.com/littlebaby/littlebaby/main/scripts/littlebabyock/littlebabyock-helpers.sh -o ~/.littlebabyock/littlebabyock-helpers.sh
echo 'source ~/.littlebabyock/littlebabyock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

If you previously installed LittleBabyDock from `scripts/shell-helpers/littlebabyock-helpers.sh`, reinstall from the new `scripts/littlebabyock/littlebabyock-helpers.sh` path. The old raw GitHub path was removed.

## What you get

### Basic operations

| Command            | Description            |
| ------------------ | ---------------------- |
| `littlebabyock-start`   | Start the gateway      |
| `littlebabyock-stop`    | Stop the gateway       |
| `littlebabyock-restart` | Restart the gateway    |
| `littlebabyock-status`  | Check container status |
| `littlebabyock-logs`    | Follow gateway logs    |

### Container access

| Command                   | Description                                   |
| ------------------------- | --------------------------------------------- |
| `littlebabyock-shell`          | Open a shell inside the gateway container     |
| `littlebabyock-cli <command>`  | Run LittleBaby CLI commands in Docker           |
| `littlebabyock-exec <command>` | Execute an arbitrary command in the container |

### Web UI and pairing

| Command                 | Description                  |
| ----------------------- | ---------------------------- |
| `littlebabyock-dashboard`    | Open the Control UI URL      |
| `littlebabyock-devices`      | List pending device pairings |
| `littlebabyock-approve <id>` | Approve a pairing request    |

### Setup and maintenance

| Command              | Description                                      |
| -------------------- | ------------------------------------------------ |
| `littlebabyock-fix-token` | Configure the gateway token inside the container |
| `littlebabyock-update`    | Pull, rebuild, and restart                       |
| `littlebabyock-rebuild`   | Rebuild the Docker image only                    |
| `littlebabyock-clean`     | Remove containers and volumes                    |

### Utilities

| Command                | Description                             |
| ---------------------- | --------------------------------------- |
| `littlebabyock-health`      | Run a gateway health check              |
| `littlebabyock-token`       | Print the gateway token                 |
| `littlebabyock-cd`          | Jump to the LittleBaby project directory  |
| `littlebabyock-config`      | Open `~/.littlebaby`                      |
| `littlebabyock-show-config` | Print config files with redacted values |
| `littlebabyock-workspace`   | Open the workspace directory            |

## First-time flow

```bash
littlebabyock-start
littlebabyock-fix-token
littlebabyock-dashboard
```

If the browser says pairing is required:

```bash
littlebabyock-devices
littlebabyock-approve <request-id>
```

## Config and secrets

LittleBabyDock works with the same Docker config split described in [Docker](/install/docker):

- `<project>/.env` for Docker-specific values like image name, ports, and the gateway token
- `~/.littlebaby/.env` for env-backed provider keys and bot tokens
- `~/.littlebaby/agents/<agentId>/agent/auth-profiles.json` for stored provider OAuth/API-key auth
- `~/.littlebaby/littlebaby.json` for behavior config

Use `littlebabyock-show-config` when you want to inspect the `.env` files and `littlebaby.json` quickly. It redacts `.env` values in its printed output.

## Related pages

- [Docker](/install/docker)
- [Docker VM Runtime](/install/docker-vm-runtime)
- [Updating](/install/updating)
