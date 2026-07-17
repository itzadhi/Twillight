# Providers

Twillight supports OpenAI-compatible providers and keeps provider metadata centralized.

## Free-Friendly Providers

These are useful when you want API-key-only access or local usage without a credit/debit card flow where available:

```text
openrouter
groq
huggingface
cerebras
sambanova
github
ollama
```

Ollama is fully local and does not need a key.

## Paid/Compatibility Provider

```text
openai
```

## Commands

```text
/providers
/provider openrouter
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
```

Multiple keys can be separated by commas, semicolons, or new lines.
