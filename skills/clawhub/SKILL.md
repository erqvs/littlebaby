---
name: littlebabyhub
description: Use the LittleBabyHub CLI to search, install, update, and publish agent skills from littlebabyhub.com. Use when you need to fetch new skills on the fly, sync installed skills to latest or a specific version, or publish new/updated skill folders with the npm-installed littlebabyhub CLI.
metadata:
  {
    "littlebaby":
      {
        "requires": { "bins": ["littlebabyhub"] },
        "install":
          [
            {
              "id": "node",
              "kind": "node",
              "package": "littlebabyhub",
              "bins": ["littlebabyhub"],
              "label": "Install LittleBabyHub CLI (npm)",
            },
          ],
      },
  }
---

# LittleBabyHub CLI

Install

```bash
npm i -g littlebabyhub
```

Auth (publish)

```bash
littlebabyhub login
littlebabyhub whoami
```

Search

```bash
littlebabyhub search "postgres backups"
```

Install

```bash
littlebabyhub install my-skill
littlebabyhub install my-skill --version 1.2.3
```

Update (hash-based match + upgrade)

```bash
littlebabyhub update my-skill
littlebabyhub update my-skill --version 1.2.3
littlebabyhub update --all
littlebabyhub update my-skill --force
littlebabyhub update --all --no-input --force
```

List

```bash
littlebabyhub list
```

Publish

```bash
littlebabyhub publish ./my-skill --slug my-skill --name "My Skill" --version 1.2.0 --changelog "Fixes + docs"
```

Notes

- Default registry: https://littlebabyhub.com (override with LITTLEBABYHUB_REGISTRY or --registry)
- Default workdir: cwd (falls back to LittleBaby workspace); install dir: ./skills (override with --workdir / --dir / LITTLEBABYHUB_WORKDIR)
- Update command hashes local files, resolves matching version, and upgrades to latest unless --version is set
