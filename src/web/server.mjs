#!/usr/bin/env node
import { createServer } from "node:http"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { basename, extname, join, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { loadConfig } from "../config/loader.mjs"
import { defaults } from "../config/defaults.mjs"
import { normalizeProviderName, providerInfo, providerNames } from "../providers/catalog.mjs"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const publicDir = join(__dirname, "public")
const MAX_BODY_BYTES = 64 * 1024
const CONFIG_KEYS = [
  "provider",
  "model",
  "fallbackModels",
  "uncensoredModel",
  "permissionMode",
  "agentMode",
  "enabledTools",
  "commandAllowlist",
  "cloudflareGatewayUrl",
  "updateCheck",
  "autoUpdate",
  "streaming",
  "actions",
  "status",
  "compact",
  "maxTokens",
  "requestTimeoutMs",
  "queueDelayMs",
  "temperature",
  "pet",
  "webSound",
  "soundTheme",
  "soundVolume",
  "dashboardDensity",
]

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
}

export function createWebServer(options = {}) {
  const env = options.env || process.env
  const cwd = options.cwd || process.cwd()
  return createServer((request, response) => {
    handleRequest(request, response, { cwd, env }).catch((error) => {
      sendJson(response, 500, { ok: false, error: "web_server_error", message: error.message })
    })
  })
}

export function publicConfig(config = loadConfig([])) {
  const provider = normalizeProviderName(config.provider) || defaults.provider
  const info = providerInfo(provider)
  return {
    provider,
    providerTitle: info.title,
    model: String(config.model || info.defaultModel),
    fallbackModels: String(config.fallbackModels || defaults.fallbackModels),
    uncensoredModel: String(config.uncensoredModel || defaults.uncensoredModel),
    permissionMode: String(config.permissionMode || defaults.permissionMode),
    agentMode: String(config.agentMode || defaults.agentMode),
    enabledTools: String(config.enabledTools || defaults.enabledTools),
    commandAllowlist: String(config.commandAllowlist || defaults.commandAllowlist),
    cloudflareGatewayUrl: String(config.cloudflareGatewayUrl || defaults.cloudflareGatewayUrl),
    updateCheck: Boolean(config.updateCheck),
    autoUpdate: Boolean(config.autoUpdate),
    streaming: Boolean(config.streaming),
    actions: Boolean(config.actions),
    status: Boolean(config.status),
    compact: Boolean(config.compact),
    maxTokens: numberOr(config.maxTokens, defaults.maxTokens),
    requestTimeoutMs: numberOr(config.requestTimeoutMs, defaults.requestTimeoutMs),
    queueDelayMs: numberOr(config.queueDelayMs, defaults.queueDelayMs),
    temperature: numberOr(config.temperature, defaults.temperature),
    pet: String(config.pet || defaults.pet),
    webSound: config.webSound === undefined ? true : Boolean(config.webSound),
    soundTheme: String(config.soundTheme || "crystal"),
    soundVolume: numberOr(config.soundVolume, 35),
    dashboardDensity: String(config.dashboardDensity || "balanced"),
  }
}

export function providerOptions() {
  return providerNames().map((name) => {
    const info = providerInfo(name)
    return {
      name,
      title: info.title,
      defaultModel: info.defaultModel,
      fallbackModels: info.fallbackModels,
      freeFriendly: Boolean(info.freeFriendly),
      noAuth: Boolean(info.noAuth),
      keyEnv: info.keyEnv || "",
      note: info.noCardNote || "",
    }
  })
}

async function handleRequest(request, response, context) {
  setBaseHeaders(response)
  if (request.method === "OPTIONS") {
    response.writeHead(204)
    response.end()
    return
  }

  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`)
  if (url.pathname === "/health") return sendJson(response, 200, { ok: true, name: "Twillight Web" })
  if (url.pathname === "/api/status") return sendJson(response, 200, await statusPayload(request, context))
  if (url.pathname === "/api/config" && request.method === "GET") return sendJson(response, 200, { ok: true, config: publicConfig(loadConfig([])) })
  if (url.pathname === "/api/config" && request.method === "POST") return updateConfig(request, response, context)
  return serveStatic(url.pathname, response)
}

async function statusPayload(request, context) {
  const config = publicConfig(loadConfig([]))
  return {
    ok: true,
    name: "Twillight Web",
    cwd: context.cwd,
    platform: process.platform,
    node: process.version,
    localOnly: true,
    config,
    providers: providerOptions(),
    soundThemes: ["crystal", "terminal", "soft", "mute"],
    densityModes: ["comfortable", "balanced", "compact"],
    commands: ["twillight", "twillight-web", "npm run web"],
  }
}

async function updateConfig(request, response, context) {
  const authorized = isLocalRequest(request)
  if (!authorized) return sendJson(response, 401, { ok: false, error: "auth_required" })
  const body = await readJsonBody(request)
  const next = validateConfigInput(body)
  await writeProjectConfig(context.cwd, next)
  return sendJson(response, 200, { ok: true, config: publicConfig(loadConfig([])), saved: join(context.cwd, ".ai", "config.yaml") })
}

function validateConfigInput(body) {
  const result = {}
  const provider = normalizeProviderName(body.provider)
  if (provider) {
    result.provider = provider
    if (!body.model) result.model = providerInfo(provider).defaultModel
  }
  if (body.model !== undefined) {
    const model = String(body.model).trim()
    if (!model || model.length > 160 || /[\r\n]/.test(model)) throw new Error("Invalid model")
    result.model = model
  }
  if (body.fallbackModels !== undefined) {
    const value = cleanList(body.fallbackModels, 1200, "Invalid fallback models")
    if (value) result.fallbackModels = value
  }
  if (body.uncensoredModel !== undefined) {
    const value = cleanScalar(body.uncensoredModel, 180, "Invalid uncensored model")
    if (value) result.uncensoredModel = value
  }
  if (body.permissionMode !== undefined) {
    const value = String(body.permissionMode)
    if (!["read-only", "workspace", "standard", "full-access"].includes(value)) throw new Error("Invalid permission mode")
    result.permissionMode = value
  }
  if (body.agentMode !== undefined) {
    const value = String(body.agentMode)
    if (!["plan", "build"].includes(value)) throw new Error("Invalid agent mode")
    result.agentMode = value
  }
  if (body.enabledTools !== undefined) {
    const value = String(body.enabledTools).trim()
    if (!value || value.length > 400 || /[\r\n]/.test(value)) throw new Error("Invalid tools value")
    result.enabledTools = value
  }
  if (body.commandAllowlist !== undefined) {
    const value = cleanList(body.commandAllowlist, 2000, "Invalid command allowlist")
    if (value) result.commandAllowlist = value
  }
  if (body.cloudflareGatewayUrl !== undefined) {
    const value = String(body.cloudflareGatewayUrl).trim()
    if (value && !/^https?:\/\/[^\s]+$/i.test(value)) throw new Error("Gateway URL must start with http:// or https://")
    result.cloudflareGatewayUrl = value
  }
  if (body.updateCheck !== undefined) result.updateCheck = Boolean(body.updateCheck)
  if (body.autoUpdate !== undefined) result.autoUpdate = Boolean(body.autoUpdate)
  if (body.streaming !== undefined) result.streaming = Boolean(body.streaming)
  if (body.actions !== undefined) result.actions = Boolean(body.actions)
  if (body.status !== undefined) result.status = Boolean(body.status)
  if (body.compact !== undefined) result.compact = Boolean(body.compact)
  if (body.maxTokens !== undefined) result.maxTokens = intRange(body.maxTokens, 256, 131072, "Invalid max tokens")
  if (body.requestTimeoutMs !== undefined) result.requestTimeoutMs = intRange(body.requestTimeoutMs, 5000, 600000, "Invalid timeout")
  if (body.queueDelayMs !== undefined) result.queueDelayMs = intRange(body.queueDelayMs, 0, 10000, "Invalid queue delay")
  if (body.temperature !== undefined) result.temperature = floatRange(body.temperature, 0, 2, "Invalid temperature")
  if (body.pet !== undefined) {
    const value = String(body.pet).trim().toLowerCase()
    if (!["sprite", "none"].includes(value)) throw new Error("Invalid pet")
    result.pet = value
  }
  if (body.webSound !== undefined) result.webSound = Boolean(body.webSound)
  if (body.soundTheme !== undefined) {
    const value = String(body.soundTheme).trim().toLowerCase()
    if (!["crystal", "terminal", "soft", "mute"].includes(value)) throw new Error("Invalid sound theme")
    result.soundTheme = value
  }
  if (body.soundVolume !== undefined) result.soundVolume = intRange(body.soundVolume, 0, 100, "Invalid sound volume")
  if (body.dashboardDensity !== undefined) {
    const value = String(body.dashboardDensity).trim().toLowerCase()
    if (!["comfortable", "balanced", "compact"].includes(value)) throw new Error("Invalid dashboard density")
    result.dashboardDensity = value
  }
  return result
}

function cleanScalar(value, maxLength, message) {
  const text = String(value || "").trim()
  if (text && (text.length > maxLength || /[\r\n]/.test(text))) throw new Error(message)
  return text
}

function cleanList(value, maxLength, message) {
  const text = String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(",")
    .trim()
  if (text && text.length > maxLength) throw new Error(message)
  return text
}

function intRange(value, min, max, message) {
  const number = Number(value)
  if (!Number.isInteger(number) || number < min || number > max) throw new Error(message)
  return number
}

function floatRange(value, min, max, message) {
  const number = Number(value)
  if (!Number.isFinite(number) || number < min || number > max) throw new Error(message)
  return number
}

function numberOr(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

async function writeProjectConfig(cwd, updates) {
  const dir = join(cwd, ".ai")
  const file = join(dir, "config.yaml")
  await mkdir(dir, { recursive: true })
  const current = existsSync(file) ? await readFile(file, "utf8") : ""
  const parsed = parseSimpleYaml(current)
  const merged = { ...parsed, ...updates }
  const lines = [
    "# Twillight project config. Secrets stay in the key vault or environment.",
    ...CONFIG_KEYS.filter((key) => merged[key] !== undefined && merged[key] !== "").map((key) => `${key}: ${yamlValue(merged[key])}`),
    "",
  ]
  await writeFile(file, lines.join("\n"), "utf8")
}

function parseSimpleYaml(text) {
  const entries = []
  for (const line of String(text || "").split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes(":")) continue
    const index = trimmed.indexOf(":")
    entries.push([trimmed.slice(0, index).trim(), trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "")])
  }
  return Object.fromEntries(entries)
}

function yamlValue(value) {
  if (typeof value === "boolean") return value ? "true" : "false"
  const text = String(value)
  if (/^[A-Za-z0-9_./:@-]+$/.test(text)) return text
  return JSON.stringify(text)
}

async function serveStatic(pathname, response) {
  const target = pathname === "/" ? "index.html" : pathname.slice(1)
  const safeTarget = target.split("/").map((part) => basename(part)).join(sep)
  const file = resolve(publicDir, safeTarget)
  if (!file.startsWith(resolve(publicDir) + sep) && file !== join(publicDir, "index.html")) {
    return sendJson(response, 404, { ok: false, error: "not_found" })
  }
  try {
    const data = await readFile(file)
    response.writeHead(200, { "content-type": mimeTypes[extname(file)] || "application/octet-stream" })
    response.end(data)
  } catch {
    sendJson(response, 404, { ok: false, error: "not_found" })
  }
}

async function readJsonBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error("Request body too large")
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString("utf8"))
}

function setBaseHeaders(response) {
  response.setHeader("x-content-type-options", "nosniff")
  response.setHeader("referrer-policy", "no-referrer")
  response.setHeader("content-security-policy", "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'")
}

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" })
  response.end(JSON.stringify(body))
}

function isLocalRequest(request) {
  const rawHost = String(request.headers.host || "").trim().toLowerCase()
  const host = rawHost.startsWith("[") ? rawHost.slice(0, rawHost.indexOf("]") + 1) : rawHost.split(":")[0]
  return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)
}

function main() {
  const port = Number(process.env.TWILLIGHT_WEB_PORT || process.env.PORT || 4177)
  const host = process.env.TWILLIGHT_WEB_HOST || "127.0.0.1"
  const server = createWebServer()
  server.listen(port, host, () => {
    console.log(`[Twillight Web] http://${host}:${port}`)
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
