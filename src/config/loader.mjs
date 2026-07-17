import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { defaults } from "./defaults.mjs"
import { providerInfo } from "../providers/catalog.mjs"

export function loadConfig(argv) {
  const projectConfig = readSimpleYaml(join(process.cwd(), ".ai", "config.yaml"))
  const env = compactObject({
    provider: process.env.TWILLIGHT_PROVIDER,
    model: process.env.TWILLIGHT_MODEL,
    streaming: bool(process.env.TWILLIGHT_STREAM),
    actions: bool(process.env.TWILLIGHT_ACTIONS),
    status: bool(process.env.TWILLIGHT_STATUS),
    compact: bool(process.env.TWILLIGHT_COMPACT),
    workspace: process.env.TWILLIGHT_WORKSPACE,
    permissionMode: process.env.TWILLIGHT_PERMISSION,
    commandAllowlist: process.env.TWILLIGHT_COMMAND_ALLOWLIST,
    enabledTools: process.env.TWILLIGHT_ENABLED_TOOLS,
    developerMode: bool(process.env.TWILLIGHT_DEV),
    developerId: process.env.TWILLIGHT_CREATOR,
    uncensoredModel: process.env.TWILLIGHT_UNCENSORED_MODEL,
    fallbackModels: process.env.TWILLIGHT_FALLBACK_MODELS,
    cloudflareGatewayUrl: process.env.TWILLIGHT_CLOUDFLARE_GATEWAY_URL,
    maxTokens: number(process.env.TWILLIGHT_MAX_TOKENS),
    requestTimeoutMs: number(process.env.TWILLIGHT_REQUEST_TIMEOUT_MS),
    queueDelayMs: number(process.env.TWILLIGHT_QUEUE_DELAY_MS),
  })
  const cli = parseFlags(argv)
  const providerOverridesProject = Boolean(env.provider || cli.provider)
  return normalizeConfig(
    { ...defaults, ...projectConfig, ...env, ...cli },
    {
      providerSpecified: Boolean(projectConfig.provider || env.provider || cli.provider),
      modelSpecified: Boolean(cli.model || env.model || (!providerOverridesProject && projectConfig.model)),
      modelOverridesProvider: Boolean(cli.model && !cli.provider || env.model && !env.provider && !cli.provider),
    },
  )
}

function normalizeConfig(config, flags = {}) {
  const inferredProvider = inferProviderFromModel(config.model)
  if (flags.modelOverridesProvider && inferredProvider) return { ...config, provider: inferredProvider }
  if (flags.providerSpecified && !flags.modelSpecified) {
    return { ...config, model: providerInfo(config.provider).defaultModel || config.model }
  }
  if (flags.providerSpecified) return config
  if (inferredProvider && inferredProvider !== config.provider) {
    return { ...config, provider: inferredProvider }
  }
  return config
}

function inferProviderFromModel(model) {
  const value = String(model || "").trim().toLowerCase()
  if (value.startsWith("@cf/")) return "cloudflare"
  if (value.endsWith(":free")) return "openrouter"
  return ""
}

function parseFlags(argv) {
  const result = {}
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (item === "--read-only") result.permissionMode = "read-only"
    else if (item === "--workspace") result.permissionMode = "workspace"
    else if (item === "--standard") result.permissionMode = "standard"
    else if (item === "--full-access") result.permissionMode = "full-access"
    else if (item === "--provider") result.provider = argv[++index]
    else if (item === "--model") result.model = argv[++index]
  }
  return result
}

function readSimpleYaml(file) {
  if (!existsSync(file)) return {}
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes(":"))
      .map((line) => {
        const index = line.indexOf(":")
        return [line.slice(0, index).trim(), coerce(line.slice(index + 1).trim())]
      }),
  )
}

function coerce(value) {
  if (value === "true") return true
  if (value === "false") return false
  if (/^\d+$/.test(value)) return Number(value)
  return value.replace(/^["']|["']$/g, "")
}

function bool(value) {
  if (value === undefined) return undefined
  return value !== "0" && value !== "false"
}

function number(value) {
  if (value === undefined || value === "") return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter((entry) => entry[1] !== undefined && entry[1] !== ""))
}
