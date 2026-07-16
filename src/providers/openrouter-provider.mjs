import { getApiKeys, maskKey } from "../config/credentials.mjs"

export function createProvider(config, root, ui) {
  const provider = ["openai", "groq"].includes(config.provider) ? config.provider : "openrouter"
  let cachedApiKeys = []
  async function apiKeys() {
    if (cachedApiKeys.length) return cachedApiKeys
    cachedApiKeys = await getApiKeys(root, provider, ui)
    return cachedApiKeys
  }
  const endpoint = providerEndpoint(provider)
  return {
    provider,
    model: config.model,
    async models() {
      return withKeys(await apiKeys(), async (key) => {
        const response = await fetch(endpoint.models, {
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(Number(config.requestTimeoutMs || 120000)),
        })
        if (!response.ok) throw await providerHttpError(response, key)
        const data = await response.json()
        return normalizeModels(provider, data)
      })
    },
    async chat(messages, callbacks = {}) {
      return withKeys(await apiKeys(), async (key) => {
        const body = {
          model: config.model,
          messages,
          temperature: config.temperature,
          stream: config.streaming,
          max_tokens: Number(config.maxTokens || 2048),
          ...(config.streaming ? { stream_options: { include_usage: true } } : {}),
        }
        const response = await fetch(endpoint.chat, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            ...(provider === "openrouter" ? { "HTTP-Referer": "http://localhost", "X-Title": "Twillight" } : {}),
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(Number(config.requestTimeoutMs || 120000)),
        })
        if (!response.ok) throw await providerHttpError(response, key)
        if (config.streaming) {
          const streamed = await stream(response, callbacks)
          if (streamed.content) return streamed
          ui.debug?.(`empty streaming response provider=${provider} model=${config.model} finish=${streamed.debug.finishReason || "unknown"} chunks=${streamed.debug.chunks} keys=${streamed.debug.keys.join(",") || "none"}`)
          return retryWithoutStreaming(endpoint.chat, key, provider, config, { ...body, stream: false, stream_options: undefined }, streamed.debug)
        }
        const data = await response.json()
        return responseFromJson(data, { source: "json" })
      })
    },
  }
}

async function retryWithoutStreaming(url, key, provider, config, body, previousDebug) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(provider === "openrouter" ? { "HTTP-Referer": "http://localhost", "X-Title": "Twillight" } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(Number(config.requestTimeoutMs || 120000)),
  })
  if (!response.ok) throw await providerHttpError(response, key)
  const data = await response.json()
  const result = responseFromJson(data, { source: "retry-json", previous: previousDebug })
  result.debug = { ...result.debug, retryAfterEmptyStream: true }
  return result
}

function providerEndpoint(provider) {
  if (provider === "openai") {
    return {
      chat: "https://api.openai.com/v1/chat/completions",
      models: "https://api.openai.com/v1/models",
    }
  }
  if (provider === "groq") {
    return {
      chat: "https://api.groq.com/openai/v1/chat/completions",
      models: "https://api.groq.com/openai/v1/models",
    }
  }
  return {
    chat: "https://openrouter.ai/api/v1/chat/completions",
    models: "https://openrouter.ai/api/v1/models",
  }
}

async function withKeys(keys, request) {
  let lastError
  for (const key of keys) {
    try {
      return await request(key)
    } catch (error) {
      lastError = error
      if (!isRetryableKeyError(error)) throw error
    }
  }
  throw lastError
}

function isRetryableKeyError(error) {
  return [401, 402, 403, 429].includes(Number(error?.status || 0))
}

function normalizeModels(provider, data) {
  const models = data.data || []
  if (provider === "openrouter") {
    return models
      .filter((model) => model.id?.endsWith(":free") || model.pricing?.prompt === "0" && model.pricing?.completion === "0")
      .map((model) => ({
        id: model.id,
        context: model.context_length || model.contextLength || "",
      }))
  }
  return models.map((model) => ({
    id: model.id,
    context: model.context_length || model.contextLength || "",
  }))
}

async function providerHttpError(response, key) {
  const message = await providerError(response)
  const error = new Error(`${message} [key ${maskKey(key)}]`)
  error.status = response.status
  return error
}

async function providerError(response) {
  const text = await response.text()
  try {
    const data = JSON.parse(text)
    return `${response.status} ${response.statusText}: ${data.error?.message || data.message || text}`
  } catch {
    return `${response.status} ${response.statusText}: ${text}`
  }
}

async function stream(response, callbacks) {
  const decoder = new TextDecoder()
  let buffer = ""
  let content = ""
  let usage = {}
  const debug = { source: "stream", chunks: 0, finishReason: "", keys: [] }
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""
    for (const line of lines) {
      if (!line.startsWith("data:")) continue
      const payload = line.slice(5).trim()
      if (!payload || payload === "[DONE]") continue
      let data
      try {
        data = JSON.parse(payload)
      } catch {
        continue
      }
      debug.chunks += 1
      debug.keys = mergeKeys(debug.keys, Object.keys(data))
      const choice = data.choices?.[0]
      if (choice?.finish_reason) debug.finishReason = choice.finish_reason
      const delta = normalizeProviderContent(choice?.delta?.content)
        || normalizeProviderContent(choice?.delta?.reasoning_content)
        || normalizeProviderContent(choice?.delta?.reasoning)
        || normalizeProviderContent(choice?.message?.content)
        || normalizeProviderContent(choice?.message?.reasoning_content)
        || normalizeProviderContent(choice?.message?.reasoning)
        || normalizeProviderContent(choice?.text)
      if (delta) {
        content += delta
        callbacks.onToken?.(delta)
      }
      if (data.usage) usage = data.usage
    }
  }
  return { content: content.trim(), usage, debug }
}

function responseFromJson(data, debug = {}) {
  const choice = data.choices?.[0] || {}
  return {
    content:
      normalizeProviderContent(choice.message?.content)
      || normalizeProviderContent(choice.message?.reasoning_content)
      || normalizeProviderContent(choice.message?.reasoning)
      || normalizeProviderContent(choice.text)
      || "",
    usage: data.usage || {},
    debug: {
      ...debug,
      finishReason: choice.finish_reason || choice.finishReason || "",
      choiceKeys: Object.keys(choice),
      messageKeys: choice.message ? Object.keys(choice.message) : [],
    },
  }
}

export function normalizeProviderContent(value) {
  if (typeof value === "string") return value.trim()
  if (!Array.isArray(value)) return ""
  return value
    .map((item) => {
      if (typeof item === "string") return item
      if (typeof item?.text === "string") return item.text
      if (typeof item?.content === "string") return item.content
      return ""
    })
    .join("")
    .trim()
}

function mergeKeys(current, next) {
  const set = new Set(current)
  for (const key of next) set.add(key)
  return [...set]
}
