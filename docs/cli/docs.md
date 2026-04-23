---
summary: "CLI reference for `littlebaby docs` (search the live docs index)"
read_when:
  - You want to search the live LittleBaby docs from the terminal
title: "docs"
---

# `littlebaby docs`

Search the live docs index.

Arguments:

- `[query...]`: search terms to send to the live docs index

Examples:

```bash
littlebaby docs
littlebaby docs browser existing-session
littlebaby docs sandbox allowHostControl
littlebaby docs gateway token secretref
```

Notes:

- With no query, `littlebaby docs` opens the live docs search entrypoint.
- Multi-word queries are passed through as one search request.
