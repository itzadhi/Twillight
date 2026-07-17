# Configuration

Configuration is layered in this order:

1. Built-in defaults
2. Project `.ai\config.yaml`
3. Environment variables
4. CLI flags

Later layers override earlier layers.

## Project Config

Create `.ai\config.yaml` in a project:

```yaml
provider: openrouter
model: cohere/north-mini-code:free
permissionMode: standard
agentMode: build
streaming: true
maxTokens: 2048
requestTimeoutMs: 120000
```

## Environment Variables

```text
TWILLIGHT_PROVIDER
TWILLIGHT_MODEL
TWILLIGHT_STREAM
TWILLIGHT_ACTIONS
TWILLIGHT_STATUS
TWILLIGHT_COMPACT
TWILLIGHT_WORKSPACE
TWILLIGHT_PERMISSION
TWILLIGHT_COMMAND_ALLOWLIST
TWILLIGHT_ENABLED_TOOLS
TWILLIGHT_DEV
TWILLIGHT_CREATOR
TWILLIGHT_UNCENSORED_MODEL
TWILLIGHT_FALLBACK_MODELS
TWILLIGHT_MAX_TOKENS
TWILLIGHT_REQUEST_TIMEOUT_MS
TWILLIGHT_QUEUE_DELAY_MS
```

## API Keys

Supported providers:

```text
OPENROUTER_API_KEY
OPENROUTER_API_KEYS
GROQ_API_KEY
GROQ_API_KEYS
HUGGINGFACE_API_KEY
HUGGINGFACE_API_KEYS
CEREBRAS_API_KEY
CEREBRAS_API_KEYS
SAMBANOVA_API_KEY
SAMBANOVA_API_KEYS
GITHUB_TOKEN
GITHUB_TOKENS
OPENAI_API_KEY
OPENAI_API_KEYS
```

Multiple keys can be separated by commas, semicolons, or new lines.

Ollama is local and does not need an API key.

## Developer Identity

The developer dragon unlocks automatically inside the `itzadhi/twillight` repository. It can also be enabled explicitly:

```cmd
set TWILLIGHT_CREATOR=itzadhi
```

or:

```cmd
set TWILLIGHT_DEV=1
```

## Defaults

Default provider:

```text
openrouter
```

Default model:

```text
cohere/north-mini-code:free
```

Fallback models are tried when a model returns empty content or retryable provider errors.
