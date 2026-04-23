---
summary: "Windows support: native and WSL2 install paths, daemon, and current caveats"
read_when:
  - Installing LittleBaby on Windows
  - Choosing between native Windows and WSL2
  - Looking for Windows companion app status
title: "Windows"
---

# Windows

LittleBaby supports both **native Windows** and **WSL2**. WSL2 is the more
stable path and recommended for the full experience — the CLI, Gateway, and
tooling run inside Linux with full compatibility. Native Windows works for
core CLI and Gateway use, with some caveats noted below.

Native Windows companion apps are planned.

## WSL2 (recommended)

- [Getting Started](/start/getting-started) (use inside WSL)
- [Install & updates](/install/updating)
- Official WSL2 guide (Microsoft): [https://learn.microsoft.com/windows/wsl/install](https://learn.microsoft.com/windows/wsl/install)

## Native Windows status

Native Windows CLI flows are improving, but WSL2 is still the recommended path.

What works well on native Windows today:

- website installer via `install.ps1`
- local CLI use such as `littlebaby --version`, `littlebaby doctor`, and `littlebaby plugins list --json`
- embedded local-agent/provider smoke such as:

```powershell
littlebaby agent --local --agent main --thinking low -m "Reply with exactly WINDOWS-HATCH-OK."
```

Current caveats:

- `littlebaby onboard --non-interactive` still expects a reachable local gateway unless you pass `--skip-health`
- `littlebaby onboard --non-interactive --install-daemon` and `littlebaby gateway install` try Windows Scheduled Tasks first
- if Scheduled Task creation is denied, LittleBaby falls back to a per-user Startup-folder login item and starts the gateway immediately
- if `schtasks` itself wedges or stops responding, LittleBaby now aborts that path quickly and falls back instead of hanging forever
- Scheduled Tasks are still preferred when available because they provide better supervisor status

If you want the native CLI only, without gateway service install, use one of these:

```powershell
littlebaby onboard --non-interactive --skip-health
littlebaby gateway run
```

If you do want managed startup on native Windows:

```powershell
littlebaby gateway install
littlebaby gateway status --json
```

If Scheduled Task creation is blocked, the fallback service mode still auto-starts after login through the current user's Startup folder.

## Gateway

- [Gateway runbook](/gateway)
- [Configuration](/gateway/configuration)

## Gateway service install (CLI)

Inside WSL2:

```
littlebaby onboard --install-daemon
```

Or:

```
littlebaby gateway install
```

Or:

```
littlebaby configure
```

Select **Gateway service** when prompted.

Repair/migrate:

```
littlebaby doctor
```

## Gateway auto-start before Windows login

For headless setups, ensure the full boot chain runs even when no one logs into
Windows.

### 1) Keep user services running without login

Inside WSL:

```bash
sudo loginctl enable-linger "$(whoami)"
```

### 2) Install the LittleBaby gateway user service

Inside WSL:

```bash
littlebaby gateway install
```

### 3) Start WSL automatically at Windows boot

In PowerShell as Administrator:

```powershell
schtasks /create /tn "WSL Boot" /tr "wsl.exe -d Ubuntu --exec /bin/true" /sc onstart /ru SYSTEM
```

Replace `Ubuntu` with your distro name from:

```powershell
wsl --list --verbose
```

### Verify startup chain

After a reboot (before Windows sign-in), check from WSL:

```bash
systemctl --user is-enabled littlebaby-gateway.service
systemctl --user status littlebaby-gateway.service --no-pager
```

## Advanced: expose WSL services over LAN (portproxy)

WSL has its own virtual network. If another machine needs to reach a service
running **inside WSL** (SSH, a local TTS server, or the Gateway), you must
forward a Windows port to the current WSL IP. The WSL IP changes after restarts,
so you may need to refresh the forwarding rule.

Example (PowerShell **as Administrator**):

```powershell
$Distro = "Ubuntu-24.04"
$ListenPort = 2222
$TargetPort = 22

$WslIp = (wsl -d $Distro -- hostname -I).Trim().Split(" ")[0]
if (-not $WslIp) { throw "WSL IP not found." }

netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$ListenPort `
  connectaddress=$WslIp connectport=$TargetPort
```

Allow the port through Windows Firewall (one-time):

```powershell
New-NetFirewallRule -DisplayName "WSL SSH $ListenPort" -Direction Inbound `
  -Protocol TCP -LocalPort $ListenPort -Action Allow
```

Refresh the portproxy after WSL restarts:

```powershell
netsh interface portproxy delete v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy add v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 `
  connectaddress=$WslIp connectport=$TargetPort | Out-Null
```

Notes:

- SSH from another machine targets the **Windows host IP** (example: `ssh user@windows-host -p 2222`).
- Remote nodes must point at a **reachable** Gateway URL (not `127.0.0.1`); use
  `littlebaby status --all` to confirm.
- Use `listenaddress=0.0.0.0` for LAN access; `127.0.0.1` keeps it local only.
- If you want this automatic, register a Scheduled Task to run the refresh
  step at login.

## Step-by-step WSL2 install

### 1) Install WSL2 + Ubuntu

Open PowerShell (Admin):

```powershell
wsl --install
# Or pick a distro explicitly:
wsl --list --online
wsl --install -d Ubuntu-24.04
```

Reboot if Windows asks.

### 2) Enable systemd (required for gateway install)

In your WSL terminal:

```bash
sudo tee /etc/wsl.conf >/dev/null <<'EOF'
[boot]
systemd=true
EOF
```

Then from PowerShell:

```powershell
wsl --shutdown
```

Re-open Ubuntu, then verify:

```bash
systemctl --user status
```

### 3) Install LittleBaby (inside WSL)

For a normal first-time setup inside WSL, follow the Linux Getting Started flow:

```bash
git clone https://github.com/littlebaby/littlebaby.git
cd littlebaby
pnpm install
pnpm build
pnpm ui:build
pnpm littlebaby onboard --install-daemon
```

If you are developing from source instead of doing first-time onboarding, use the
source dev loop from [Setup](/start/setup):

```bash
pnpm install
# First run only (or after resetting local LittleBaby config/workspace)
pnpm littlebaby setup
pnpm gateway:watch
```

Full guide: [Getting Started](/start/getting-started)

## Windows companion app

We do not have a Windows companion app yet. Contributions are welcome if you want
contributions to make it happen.
