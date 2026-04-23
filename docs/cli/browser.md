---
summary: "CLI reference for `littlebaby browser` (lifecycle, profiles, tabs, actions, state, and debugging)"
read_when:
  - You use `littlebaby browser` and want examples for common tasks
  - You want to control a browser running on another machine via a node host
  - You want to attach to your local signed-in Chrome via Chrome MCP
title: "browser"
---

# `littlebaby browser`

Manage LittleBaby's browser control surface and run browser actions (lifecycle, profiles, tabs, snapshots, screenshots, navigation, input, state emulation, and debugging).

Related:

- Browser tool + API: [Browser tool](/tools/browser)

## Common flags

- `--url <gatewayWsUrl>`: Gateway WebSocket URL (defaults to config).
- `--token <token>`: Gateway token (if required).
- `--timeout <ms>`: request timeout (ms).
- `--expect-final`: wait for a final Gateway response.
- `--browser-profile <name>`: choose a browser profile (default from config).
- `--json`: machine-readable output (where supported).

## Quick start (local)

```bash
littlebaby browser profiles
littlebaby browser --browser-profile littlebaby start
littlebaby browser --browser-profile littlebaby open https://example.com
littlebaby browser --browser-profile littlebaby snapshot
```

## Quick troubleshooting

If `start` fails with `not reachable after start`, troubleshoot CDP readiness first. If `start` and `tabs` succeed but `open` or `navigate` fails, the browser control plane is healthy and the failure is usually navigation SSRF policy.

Minimal sequence:

```bash
littlebaby browser --browser-profile littlebaby start
littlebaby browser --browser-profile littlebaby tabs
littlebaby browser --browser-profile littlebaby open https://example.com
```

Detailed guidance: [Browser troubleshooting](/tools/browser#cdp-startup-failure-vs-navigation-ssrf-block)

## Lifecycle

```bash
littlebaby browser status
littlebaby browser start
littlebaby browser stop
littlebaby browser --browser-profile littlebaby reset-profile
```

Notes:

- For `attachOnly` and remote CDP profiles, `littlebaby browser stop` closes the
  active control session and clears temporary emulation overrides even when
  LittleBaby did not launch the browser process itself.
- For local managed profiles, `littlebaby browser stop` stops the spawned browser
  process.

## If the command is missing

If `littlebaby browser` is an unknown command, check `plugins.allow` in
`~/.littlebaby/littlebaby.json`.

When `plugins.allow` is present, the bundled browser plugin must be listed
explicitly:

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

`browser.enabled=true` does not restore the CLI subcommand when the plugin
allowlist excludes `browser`.

Related: [Browser tool](/tools/browser#missing-browser-command-or-tool)

## Profiles

Profiles are named browser routing configs. In practice:

- `littlebaby`: launches or attaches to a dedicated LittleBaby-managed Chrome instance (isolated user data dir).
- `user`: controls your existing signed-in Chrome session via Chrome DevTools MCP.
- custom CDP profiles: point at a local or remote CDP endpoint.

```bash
littlebaby browser profiles
littlebaby browser create-profile --name work --color "#FF5A36"
littlebaby browser create-profile --name chrome-live --driver existing-session
littlebaby browser create-profile --name remote --cdp-url https://browser-host.example.com
littlebaby browser delete-profile --name work
```

Use a specific profile:

```bash
littlebaby browser --browser-profile work tabs
```

## Tabs

```bash
littlebaby browser tabs
littlebaby browser tab new
littlebaby browser tab select 2
littlebaby browser tab close 2
littlebaby browser open https://docs.littlebaby.ai
littlebaby browser focus <targetId>
littlebaby browser close <targetId>
```

## Snapshot / screenshot / actions

Snapshot:

```bash
littlebaby browser snapshot
```

Screenshot:

```bash
littlebaby browser screenshot
littlebaby browser screenshot --full-page
littlebaby browser screenshot --ref e12
```

Notes:

- `--full-page` is for page captures only; it cannot be combined with `--ref`
  or `--element`.
- `existing-session` / `user` profiles support page screenshots and `--ref`
  screenshots from snapshot output, but not CSS `--element` screenshots.

Navigate/click/type (ref-based UI automation):

```bash
littlebaby browser navigate https://example.com
littlebaby browser click <ref>
littlebaby browser type <ref> "hello"
littlebaby browser press Enter
littlebaby browser hover <ref>
littlebaby browser scrollintoview <ref>
littlebaby browser drag <startRef> <endRef>
littlebaby browser select <ref> OptionA OptionB
littlebaby browser fill --fields '[{"ref":"1","value":"Ada"}]'
littlebaby browser wait --text "Done"
littlebaby browser evaluate --fn '(el) => el.textContent' --ref <ref>
```

File + dialog helpers:

```bash
littlebaby browser upload /tmp/littlebaby/uploads/file.pdf --ref <ref>
littlebaby browser waitfordownload
littlebaby browser download <ref> report.pdf
littlebaby browser dialog --accept
```

## State and storage

Viewport + emulation:

```bash
littlebaby browser resize 1280 720
littlebaby browser set viewport 1280 720
littlebaby browser set offline on
littlebaby browser set media dark
littlebaby browser set timezone Europe/London
littlebaby browser set locale en-GB
littlebaby browser set geo 51.5074 -0.1278 --accuracy 25
littlebaby browser set device "iPhone 14"
littlebaby browser set headers '{"x-test":"1"}'
littlebaby browser set credentials myuser mypass
```

Cookies + storage:

```bash
littlebaby browser cookies
littlebaby browser cookies set session abc123 --url https://example.com
littlebaby browser cookies clear
littlebaby browser storage local get
littlebaby browser storage local set token abc123
littlebaby browser storage session clear
```

## Debugging

```bash
littlebaby browser console --level error
littlebaby browser pdf
littlebaby browser responsebody "**/api"
littlebaby browser highlight <ref>
littlebaby browser errors --clear
littlebaby browser requests --filter api
littlebaby browser trace start
littlebaby browser trace stop --out trace.zip
```

## Existing Chrome via MCP

Use the built-in `user` profile, or create your own `existing-session` profile:

```bash
littlebaby browser --browser-profile user tabs
littlebaby browser create-profile --name chrome-live --driver existing-session
littlebaby browser create-profile --name brave-live --driver existing-session --user-data-dir "~/Library/Application Support/BraveSoftware/Brave-Browser"
littlebaby browser --browser-profile chrome-live tabs
```

This path is host-only. For Docker, headless servers, Browserless, or other remote setups, use a CDP profile instead.

Current existing-session limits:

- snapshot-driven actions use refs, not CSS selectors
- `click` is left-click only
- `type` does not support `slowly=true`
- `press` does not support `delayMs`
- `hover`, `scrollintoview`, `drag`, `select`, `fill`, and `evaluate` reject
  per-call timeout overrides
- `select` supports one value only
- `wait --load networkidle` is not supported
- file uploads require `--ref` / `--input-ref`, do not support CSS
  `--element`, and currently support one file at a time
- dialog hooks do not support `--timeout`
- screenshots support page captures and `--ref`, but not CSS `--element`
- `responsebody`, download interception, PDF export, and batch actions still
  require a managed browser or raw CDP profile

## Remote browser control (node host proxy)

If the Gateway runs on a different machine than the browser, run a **node host** on the machine that has Chrome/Brave/Edge/Chromium. The Gateway will proxy browser actions to that node (no separate browser control server required).

Use `gateway.nodes.browser.mode` to control auto-routing and `gateway.nodes.browser.node` to pin a specific node if multiple are connected.

Security + remote setup: [Browser tool](/tools/browser), [Remote access](/gateway/remote), [Tailscale](/gateway/tailscale), [Security](/gateway/security)
