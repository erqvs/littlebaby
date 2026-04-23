---
summary: "Install LittleBaby — installer script, npm/pnpm/bun, from source, Docker, and more"
read_when:
  - You need an install method other than the Getting Started quickstart
  - You want to deploy to a cloud platform
  - You need to update, migrate, or uninstall
title: "Install"
---

# Install

## Recommended: installer script

The fastest way to install. It detects your OS, installs Node if needed, installs LittleBaby, and launches onboarding.

<Tabs>
  <Tab title="macOS / Linux / WSL2">
    ```bash
    curl -fsSL https://littlebaby.ai/install.sh | bash
    ```
  </Tab>
  <Tab title="Windows (PowerShell)">
    ```powershell
    iwr -useb https://littlebaby.ai/install.ps1 | iex
    ```
  </Tab>
</Tabs>

To install without running onboarding:

<Tabs>
  <Tab title="macOS / Linux / WSL2">
    ```bash
    curl -fsSL https://littlebaby.ai/install.sh | bash -s -- --no-onboard
    ```
  </Tab>
  <Tab title="Windows (PowerShell)">
    ```powershell
    & ([scriptblock]::Create((iwr -useb https://littlebaby.ai/install.ps1))) -NoOnboard
    ```
  </Tab>
</Tabs>

For all flags and CI/automation options, see [Installer internals](/install/installer).

## System requirements

- **Node 24** (recommended) or Node 22.14+ — the installer script handles this automatically
- **macOS, Linux, or Windows** — both native Windows and WSL2 are supported; WSL2 is more stable. See [Windows](/platforms/windows).
- `pnpm` is only needed if you build from source

## Alternative install methods

### Local prefix installer (`install-cli.sh`)

Use this when you want LittleBaby and Node kept under a local prefix such as
`~/.littlebaby`, without depending on a system-wide Node install:

```bash
curl -fsSL https://littlebaby.ai/install-cli.sh | bash
```

It supports npm installs by default, plus git-checkout installs under the same
prefix flow. Full reference: [Installer internals](/install/installer#install-clish).

### npm, pnpm, or bun

If you already manage Node yourself:

<Tabs>
  <Tab title="npm">
    ```bash
    npm install -g littlebaby@latest
    littlebaby onboard --install-daemon
    ```
  </Tab>
  <Tab title="pnpm">
    ```bash
    pnpm add -g littlebaby@latest
    pnpm approve-builds -g
    littlebaby onboard --install-daemon
    ```

    <Note>
    pnpm requires explicit approval for packages with build scripts. Run `pnpm approve-builds -g` after the first install.
    </Note>

  </Tab>
  <Tab title="bun">
    ```bash
    bun add -g littlebaby@latest
    littlebaby onboard --install-daemon
    ```

    <Note>
    Bun is supported for the global CLI install path. For the Gateway runtime, Node remains the recommended daemon runtime.
    </Note>

  </Tab>
</Tabs>

<Accordion title="Troubleshooting: sharp build errors (npm)">
  If `sharp` fails due to a globally installed libvips:

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g littlebaby@latest
```

</Accordion>

### From source

For contributors or anyone who wants to run from a local checkout:

```bash
git clone https://github.com/littlebaby/littlebaby.git
cd littlebaby
pnpm install && pnpm build && pnpm ui:build
pnpm link --global
littlebaby onboard --install-daemon
```

Or skip the link and use `pnpm littlebaby ...` from inside the repo. See [Setup](/start/setup) for full development workflows.

### Install from GitHub main

```bash
npm install -g github:littlebaby/littlebaby#main
```

### Containers and package managers

<CardGroup cols={2}>
  <Card title="Docker" href="/install/docker" icon="container">
    Containerized or headless deployments.
  </Card>
  <Card title="Podman" href="/install/podman" icon="container">
    Rootless container alternative to Docker.
  </Card>
  <Card title="Nix" href="/install/nix" icon="snowflake">
    Declarative install via Nix flake.
  </Card>
  <Card title="Ansible" href="/install/ansible" icon="server">
    Automated fleet provisioning.
  </Card>
  <Card title="Bun" href="/install/bun" icon="zap">
    CLI-only usage via the Bun runtime.
  </Card>
</CardGroup>

## Verify the install

```bash
littlebaby --version      # confirm the CLI is available
littlebaby doctor         # check for config issues
littlebaby gateway status # verify the Gateway is running
```

If you want managed startup after install:

- macOS: LaunchAgent via `littlebaby onboard --install-daemon` or `littlebaby gateway install`
- Linux/WSL2: systemd user service via the same commands
- Native Windows: Scheduled Task first, with a per-user Startup-folder login item fallback if task creation is denied

## Hosting and deployment

Deploy LittleBaby on a cloud server or VPS:

<CardGroup cols={3}>
  <Card title="VPS" href="/vps">Any Linux VPS</Card>
  <Card title="Docker VM" href="/install/docker-vm-runtime">Shared Docker steps</Card>
  <Card title="Kubernetes" href="/install/kubernetes">K8s</Card>
  <Card title="Fly.io" href="/install/fly">Fly.io</Card>
  <Card title="Hetzner" href="/install/hetzner">Hetzner</Card>
  <Card title="GCP" href="/install/gcp">Google Cloud</Card>
  <Card title="Azure" href="/install/azure">Azure</Card>
  <Card title="Railway" href="/install/railway">Railway</Card>
  <Card title="Render" href="/install/render">Render</Card>
  <Card title="Northflank" href="/install/northflank">Northflank</Card>
</CardGroup>

## Update, migrate, or uninstall

<CardGroup cols={3}>
  <Card title="Updating" href="/install/updating" icon="refresh-cw">
    Keep LittleBaby up to date.
  </Card>
  <Card title="Migrating" href="/install/migrating" icon="arrow-right">
    Move to a new machine.
  </Card>
  <Card title="Uninstall" href="/install/uninstall" icon="trash-2">
    Remove LittleBaby completely.
  </Card>
</CardGroup>

## Troubleshooting: `littlebaby` not found

If the install succeeded but `littlebaby` is not found in your terminal:

```bash
node -v           # Node installed?
npm prefix -g     # Where are global packages?
echo "$PATH"      # Is the global bin dir in PATH?
```

If `$(npm prefix -g)/bin` is not in your `$PATH`, add it to your shell startup file (`~/.zshrc` or `~/.bashrc`):

```bash
export PATH="$(npm prefix -g)/bin:$PATH"
```

Then open a new terminal. See [Node setup](/install/node) for more details.
