---
summary: "CLI reference for `littlebaby backup` (create local backup archives)"
read_when:
  - You want a first-class backup archive for local LittleBaby state
  - You want to preview which paths would be included before reset or uninstall
title: "backup"
---

# `littlebaby backup`

Create a local backup archive for LittleBaby state, config, auth profiles, channel/provider credentials, sessions, and optionally workspaces.

```bash
littlebaby backup create
littlebaby backup create --output ~/Backups
littlebaby backup create --dry-run --json
littlebaby backup create --verify
littlebaby backup create --no-include-workspace
littlebaby backup create --only-config
littlebaby backup verify ./2026-03-09T00-00-00.000Z-littlebaby-backup.tar.gz
```

## Notes

- The archive includes a `manifest.json` file with the resolved source paths and archive layout.
- Default output is a timestamped `.tar.gz` archive in the current working directory.
- If the current working directory is inside a backed-up source tree, LittleBaby falls back to your home directory for the default archive location.
- Existing archive files are never overwritten.
- Output paths inside the source state/workspace trees are rejected to avoid self-inclusion.
- `littlebaby backup verify <archive>` validates that the archive contains exactly one root manifest, rejects traversal-style archive paths, and checks that every manifest-declared payload exists in the tarball.
- `littlebaby backup create --verify` runs that validation immediately after writing the archive.
- `littlebaby backup create --only-config` backs up just the active JSON config file.

## What gets backed up

`littlebaby backup create` plans backup sources from your local LittleBaby install:

- The state directory returned by LittleBaby's local state resolver, usually `~/.littlebaby`
- The active config file path
- The resolved `credentials/` directory when it exists outside the state directory
- Workspace directories discovered from the current config, unless you pass `--no-include-workspace`

Model auth profiles are already part of the state directory under
`agents/<agentId>/agent/auth-profiles.json`, so they are normally covered by the
state backup entry.

If you use `--only-config`, LittleBaby skips state, credentials-directory, and workspace discovery and archives only the active config file path.

LittleBaby canonicalizes paths before building the archive. If config, the
credentials directory, or a workspace already live inside the state directory,
they are not duplicated as separate top-level backup sources. Missing paths are
skipped.

The archive payload stores file contents from those source trees, and the embedded `manifest.json` records the resolved absolute source paths plus the archive layout used for each asset.

## Invalid config behavior

`littlebaby backup` intentionally bypasses the normal config preflight so it can still help during recovery. Because workspace discovery depends on a valid config, `littlebaby backup create` now fails fast when the config file exists but is invalid and workspace backup is still enabled.

If you still want a partial backup in that situation, rerun:

```bash
littlebaby backup create --no-include-workspace
```

That keeps state, config, and the external credentials directory in scope while
skipping workspace discovery entirely.

If you only need a copy of the config file itself, `--only-config` also works when the config is malformed because it does not rely on parsing the config for workspace discovery.

## Size and performance

LittleBaby does not enforce a built-in maximum backup size or per-file size limit.

Practical limits come from the local machine and destination filesystem:

- Available space for the temporary archive write plus the final archive
- Time to walk large workspace trees and compress them into a `.tar.gz`
- Time to rescan the archive if you use `littlebaby backup create --verify` or run `littlebaby backup verify`
- Filesystem behavior at the destination path. LittleBaby prefers a no-overwrite hard-link publish step and falls back to exclusive copy when hard links are unsupported

Large workspaces are usually the main driver of archive size. If you want a smaller or faster backup, use `--no-include-workspace`.

For the smallest archive, use `--only-config`.
