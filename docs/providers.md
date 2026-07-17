# Providers

Twillight supports OpenAI-compatible providers and keeps provider metadata centralized.

## Free-Friendly Providers

These are useful when you want API-key-only access or local usage without a credit/debit card flow where available:

```text
openrouter
cloudflare
groq
huggingface
cerebras
sambanova
github
ollama
```

Cloudflare uses your deployed Workers AI gateway. Ollama is fully local and does not need a key.

## Cloudflare Workers AI Gateway

Default gateway:

```text
https://ai.itzadhi.in
```

Use it:

```text
/provider cloudflare
/models
/model @cf/moonshotai/kimi-k2.7-code
```

For a different Worker URL:

```cmd
set TWILLIGHT_PROVIDER=cloudflare
set TWILLIGHT_CLOUDFLARE_GATEWAY_URL=https://your-worker.example.workers.dev
set TWILLIGHT_MODEL=@cf/moonshotai/kimi-k2.7-code
twillight
```

The Worker route must be API-accessible. If Cloudflare returns a browser challenge page, add a WAF skip rule for the Worker route or disable managed challenges for that hostname/path.

## Paid/Compatibility Provider

```text
openai
```

## Commands

```text
/providers
/provider openrouter
/provider cloudflare
/provider groq
/provider huggingface
/provider cerebras
/provider sambanova
/provider github
/provider ollama
/provider openai
/models
/use 1
/key groq
/key-add openrouter
```

## Environment Variables

```text
OPENROUTER_API_KEY / OPENROUTER_API_KEYS
GROQ_API_KEY / GROQ_API_KEYS
HUGGINGFACE_API_KEY / HUGGINGFACE_API_KEYS
CEREBRAS_API_KEY / CEREBRAS_API_KEYS
SAMBANOVA_API_KEY / SAMBANOVA_API_KEYS
GITHUB_TOKEN / GITHUB_TOKENS
OPENAI_API_KEY / OPENAI_API_KEYS
TWILLIGHT_CLOUDFLARE_GATEWAY_URL
```

Multiple keys can be separated by commas, semicolons, or new lines.
