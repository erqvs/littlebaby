---
summary: "Infer-first CLI for provider-backed model, image, audio, TTS, video, web, and embedding workflows"
read_when:
  - Adding or modifying `littlebaby infer` commands
  - Designing stable headless capability automation
title: "Inference CLI"
---

# Inference CLI

`littlebaby infer` is the canonical headless surface for provider-backed inference workflows.

It intentionally exposes capability families, not raw gateway RPC names and not raw agent tool ids.

## Turn infer into a skill

Copy and paste this to an agent:

```text
Read https://docs.littlebaby.ai/cli/infer, then create a skill that routes my common workflows to `littlebaby infer`.
Focus on model runs, image generation, video generation, audio transcription, TTS, web search, and embeddings.
```

A good infer-based skill should:

- map common user intents to the correct infer subcommand
- include a few canonical infer examples for the workflows it covers
- prefer `littlebaby infer ...` in examples and suggestions
- avoid re-documenting the entire infer surface inside the skill body

Typical infer-focused skill coverage:

- `littlebaby infer model run`
- `littlebaby infer image generate`
- `littlebaby infer audio transcribe`
- `littlebaby infer tts convert`
- `littlebaby infer web search`
- `littlebaby infer embedding create`

## Why use infer

`littlebaby infer` provides one consistent CLI for provider-backed inference tasks inside LittleBaby.

Benefits:

- Use the providers and models already configured in LittleBaby instead of wiring up one-off wrappers for each backend.
- Keep model, image, audio transcription, TTS, video, web, and embedding workflows under one command tree.
- Use a stable `--json` output shape for scripts, automation, and agent-driven workflows.
- Prefer a first-party LittleBaby surface when the task is fundamentally "run inference."
- Use the normal local path without requiring the gateway for most infer commands.

## Command tree

```text
 littlebaby infer
  list
  inspect

  model
    run
    list
    inspect
    providers
    auth login
    auth logout
    auth status

  image
    generate
    edit
    describe
    describe-many
    providers

  audio
    transcribe
    providers

  tts
    convert
    voices
    providers
    status
    enable
    disable
    set-provider

  video
    generate
    describe
    providers

  web
    search
    fetch
    providers

  embedding
    create
    providers
```

## Common tasks

This table maps common inference tasks to the corresponding infer command.

| Task                    | Command                                                                | Notes                                                |
| ----------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| Run a text/model prompt | `littlebaby infer model run --prompt "..." --json`                       | Uses the normal local path by default                |
| Generate an image       | `littlebaby infer image generate --prompt "..." --json`                  | Use `image edit` when starting from an existing file |
| Describe an image file  | `littlebaby infer image describe --file ./image.png --json`              | `--model` must be `<provider/model>`                 |
| Transcribe audio        | `littlebaby infer audio transcribe --file ./memo.m4a --json`             | `--model` must be `<provider/model>`                 |
| Synthesize speech       | `littlebaby infer tts convert --text "..." --output ./speech.mp3 --json` | `tts status` is gateway-oriented                     |
| Generate a video        | `littlebaby infer video generate --prompt "..." --json`                  |                                                      |
| Describe a video file   | `littlebaby infer video describe --file ./clip.mp4 --json`               | `--model` must be `<provider/model>`                 |
| Search the web          | `littlebaby infer web search --query "..." --json`                       |                                                      |
| Fetch a web page        | `littlebaby infer web fetch --url https://example.com --json`            |                                                      |
| Create embeddings       | `littlebaby infer embedding create --text "..." --json`                  |                                                      |

## Behavior

- `littlebaby infer ...` is the primary CLI surface for these workflows.
- Use `--json` when the output will be consumed by another command or script.
- Use `--provider` or `--model provider/model` when a specific backend is required.
- For `image describe`, `audio transcribe`, and `video describe`, `--model` must use the form `<provider/model>`.
- Stateless execution commands default to local.
- Gateway-managed state commands default to gateway.
- The normal local path does not require the gateway to be running.

## Model

Use `model` for provider-backed text inference and model/provider inspection.

```bash
littlebaby infer model run --prompt "Reply with exactly: smoke-ok" --json
littlebaby infer model run --prompt "Summarize this changelog entry" --provider openai --json
littlebaby infer model providers --json
littlebaby infer model inspect --name gpt-5.4 --json
```

Notes:

- `model run` reuses the agent runtime so provider/model overrides behave like normal agent execution.
- `model auth login`, `model auth logout`, and `model auth status` manage saved provider auth state.

## Image

Use `image` for generation, edit, and description.

```bash
littlebaby infer image generate --prompt "friendly lobster illustration" --json
littlebaby infer image generate --prompt "cinematic product photo of headphones" --json
littlebaby infer image describe --file ./photo.jpg --json
littlebaby infer image describe --file ./ui-screenshot.png --model openai/gpt-4.1-mini --json
```

Notes:

- Use `image edit` when starting from existing input files.
- For `image describe`, `--model` must be `<provider/model>`.

## Audio

Use `audio` for file transcription.

```bash
littlebaby infer audio transcribe --file ./memo.m4a --json
littlebaby infer audio transcribe --file ./team-sync.m4a --language en --prompt "Focus on names and action items" --json
littlebaby infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

Notes:

- `audio transcribe` is for file transcription, not realtime session management.
- `--model` must be `<provider/model>`.

## TTS

Use `tts` for speech synthesis and TTS provider state.

```bash
littlebaby infer tts convert --text "hello from littlebaby" --output ./hello.mp3 --json
littlebaby infer tts convert --text "Your build is complete" --output ./build-complete.mp3 --json
littlebaby infer tts providers --json
littlebaby infer tts status --json
```

Notes:

- `tts status` defaults to gateway because it reflects gateway-managed TTS state.
- Use `tts providers`, `tts voices`, and `tts set-provider` to inspect and configure TTS behavior.

## Video

Use `video` for generation and description.

```bash
littlebaby infer video generate --prompt "cinematic sunset over the ocean" --json
littlebaby infer video generate --prompt "slow drone shot over a forest lake" --json
littlebaby infer video describe --file ./clip.mp4 --json
littlebaby infer video describe --file ./clip.mp4 --model openai/gpt-4.1-mini --json
```

Notes:

- `--model` must be `<provider/model>` for `video describe`.

## Web

Use `web` for search and fetch workflows.

```bash
littlebaby infer web search --query "LittleBaby docs" --json
littlebaby infer web search --query "LittleBaby infer web providers" --json
littlebaby infer web fetch --url https://docs.littlebaby.ai/cli/infer --json
littlebaby infer web providers --json
```

Notes:

- Use `web providers` to inspect available, configured, and selected providers.

## Embedding

Use `embedding` for vector creation and embedding provider inspection.

```bash
littlebaby infer embedding create --text "friendly lobster" --json
littlebaby infer embedding create --text "customer support ticket: delayed shipment" --model openai/text-embedding-3-large --json
littlebaby infer embedding providers --json
```

## JSON output

Infer commands normalize JSON output under a shared envelope:

```json
{
  "ok": true,
  "capability": "image.generate",
  "transport": "local",
  "provider": "openai",
  "model": "gpt-image-1",
  "attempts": [],
  "outputs": []
}
```

Top-level fields are stable:

- `ok`
- `capability`
- `transport`
- `provider`
- `model`
- `attempts`
- `outputs`
- `error`

## Common pitfalls

```bash
# Bad
littlebaby infer media image generate --prompt "friendly lobster"

# Good
littlebaby infer image generate --prompt "friendly lobster"
```

```bash
# Bad
littlebaby infer audio transcribe --file ./memo.m4a --model whisper-1 --json

# Good
littlebaby infer audio transcribe --file ./memo.m4a --model openai/whisper-1 --json
```

## Notes

- `littlebaby capability ...` is an alias for `littlebaby infer ...`.
