---
summary: "CLI reference for `littlebaby skills` (search/install/update/list/info/check)"
read_when:
  - You want to see which skills are available and ready to run
  - You want to search, install, or update skills from LittleBabyHub
  - You want to debug missing binaries/env/config for skills
title: "skills"
---

# `littlebaby skills`

Inspect local skills and install/update skills from LittleBabyHub.

Related:

- Skills system: [Skills](/tools/skills)
- Skills config: [Skills config](/tools/skills-config)
- LittleBabyHub installs: [LittleBabyHub](/tools/littlebabyhub)

## Commands

```bash
littlebaby skills search "calendar"
littlebaby skills search --limit 20 --json
littlebaby skills install <slug>
littlebaby skills install <slug> --version <version>
littlebaby skills install <slug> --force
littlebaby skills update <slug>
littlebaby skills update --all
littlebaby skills list
littlebaby skills list --eligible
littlebaby skills list --json
littlebaby skills list --verbose
littlebaby skills info <name>
littlebaby skills info <name> --json
littlebaby skills check
littlebaby skills check --json
```

`search`/`install`/`update` use LittleBabyHub directly and install into the active
workspace `skills/` directory. `list`/`info`/`check` still inspect the local
skills visible to the current workspace and config.

This CLI `install` command downloads skill folders from LittleBabyHub. Gateway-backed
skill dependency installs triggered from onboarding or Skills settings use the
separate `skills.install` request path instead.

Notes:

- `search [query...]` accepts an optional query; omit it to browse the default
  LittleBabyHub search feed.
- `search --limit <n>` caps returned results.
- `install --force` overwrites an existing workspace skill folder for the same
  slug.
- `update --all` only updates tracked LittleBabyHub installs in the active workspace.
- `list` is the default action when no subcommand is provided.
- `list`, `info`, and `check` write their rendered output to stdout. With
  `--json`, that means the machine-readable payload stays on stdout for pipes
  and scripts.
