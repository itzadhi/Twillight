# Twillight Web

Twillight Web is the browser control panel for the same local Twillight workspace. It is intentionally small and Node-only, so it can run anywhere the CLI runs.

## Start

```bat
twillight-web
```

or from the repository:

```bat
npm run web
```

Open:

```text
http://127.0.0.1:4177
```

Set a custom port:

```bat
set TWILLIGHT_WEB_PORT=4180
twillight-web
```

## Local First

There is no login gate. The website is a local cockpit for the folder where you start it. Config writes are accepted only from loopback hosts such as `127.0.0.1` and `localhost`.

## Config

The website edits the same project file as the CLI:

```text
.ai/config.yaml
```

It can configure:

- provider
- model
- fallback models
- local tool access
- command allowlist
- Cloudflare gateway URL
- agent mode
- permission profile
- enabled tools
- update checks
- request limits
- CLI-style web sounds
- dashboard density

Secrets are not displayed or saved by the website. Keep API keys in the Twillight key vault or environment variables.

## Security

- API responses are `no-store`.
- Static file serving blocks path traversal.
- POST bodies are limited.
- The web app never returns API keys or worker tokens.
