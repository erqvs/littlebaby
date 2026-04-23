# MiniMax (LittleBaby plugin)

Bundled MiniMax plugin for both:

- API-key provider setup (`minimax`)
- Token Plan OAuth setup (`minimax-portal`)

## Enable

```bash
littlebaby plugins enable minimax
```

Restart the Gateway after enabling.

```bash
littlebaby gateway restart
```

## Authenticate

OAuth:

```bash
littlebaby models auth login --provider minimax-portal --set-default
```

API key:

```bash
littlebaby setup --wizard --auth-choice minimax-global-api
```

## Notes

- MiniMax OAuth uses a user-code login flow.
- OAuth currently targets the Token Plan path.
