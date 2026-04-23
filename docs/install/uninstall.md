---
summary: "Uninstall LittleBaby completely (CLI, service, state, workspace)"
read_when:
  - You want to remove LittleBaby from a machine
  - The gateway service is still running after uninstall
title: "Uninstall"
---

# Uninstall

Two paths:

- **Easy path** if `littlebaby` is still installed.
- **Manual service removal** if the CLI is gone but the service is still running.

## Easy path (CLI still installed)

Recommended: use the built-in uninstaller:

```bash
littlebaby uninstall
```

Non-interactive (automation / npx):

```bash
littlebaby uninstall --all --yes --non-interactive
npx -y littlebaby uninstall --all --yes --non-interactive
```

Manual steps (same result):

1. Stop the gateway service:

```bash
littlebaby gateway stop
```

2. Uninstall the gateway service (launchd/systemd/schtasks):

```bash
littlebaby gateway uninstall
```

3. Delete state + config:

```bash
rm -rf "${LITTLEBABY_STATE_DIR:-$HOME/.littlebaby}"
```

If you set `LITTLEBABY_CONFIG_PATH` to a custom location outside the state dir, delete that file too.

4. Delete your workspace (optional, removes agent files):

```bash
rm -rf ~/.littlebaby/workspace
```

5. Remove the CLI install (pick the one you used):

```bash
npm rm -g littlebaby
pnpm remove -g littlebaby
bun remove -g littlebaby
```

6. If you installed the macOS app:

```bash
rm -rf /Applications/LittleBaby.app
```

Notes:

- If you used profiles (`--profile` / `LITTLEBABY_PROFILE`), repeat step 3 for each state dir (defaults are `~/.littlebaby-<profile>`).
- In remote mode, the state dir lives on the **gateway host**, so run steps 1-4 there too.

## Manual service removal (CLI not installed)

Use this if the gateway service keeps running but `littlebaby` is missing.

### macOS (launchd)

Default label is `ai.littlebaby.gateway` (or `ai.littlebaby.<profile>`; legacy `com.littlebaby.*` may still exist):

```bash
launchctl bootout gui/$UID/ai.littlebaby.gateway
rm -f ~/Library/LaunchAgents/ai.littlebaby.gateway.plist
```

If you used a profile, replace the label and plist name with `ai.littlebaby.<profile>`. Remove any legacy `com.littlebaby.*` plists if present.

### Linux (systemd user unit)

Default unit name is `littlebaby-gateway.service` (or `littlebaby-gateway-<profile>.service`):

```bash
systemctl --user disable --now littlebaby-gateway.service
rm -f ~/.config/systemd/user/littlebaby-gateway.service
systemctl --user daemon-reload
```

### Windows (Scheduled Task)

Default task name is `LittleBaby Gateway` (or `LittleBaby Gateway (<profile>)`).
The task script lives under your state dir.

```powershell
schtasks /Delete /F /TN "LittleBaby Gateway"
Remove-Item -Force "$env:USERPROFILE\.littlebaby\gateway.cmd"
```

If you used a profile, delete the matching task name and `~\.littlebaby-<profile>\gateway.cmd`.

## Normal install vs source checkout

### Normal install (install.sh / npm / pnpm / bun)

If you used `https://littlebaby.ai/install.sh` or `install.ps1`, the CLI was installed with `npm install -g littlebaby@latest`.
Remove it with `npm rm -g littlebaby` (or `pnpm remove -g` / `bun remove -g` if you installed that way).

### Source checkout (git clone)

If you run from a repo checkout (`git clone` + `littlebaby ...` / `bun run littlebaby ...`):

1. Uninstall the gateway service **before** deleting the repo (use the easy path above or manual service removal).
2. Delete the repo directory.
3. Remove state + workspace as shown above.
