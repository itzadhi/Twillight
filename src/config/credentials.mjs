import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import readline from "node:readline/promises"
import { Writable } from "node:stream"
import { providerInfo, providerNames } from "../providers/catalog.mjs"

export function credentialPath(root) {
  return join(userConfigDir(), "credentials.json")
}

export function projectCredentialPath(root) {
  return join(root, ".ai", "credentials.json")
}

export function readCredentials(root) {
  const file = credentialPath(root)
  const projectFile = projectCredentialPath(root)
  const projectCredentials = normalizeCredentials(readCredentialFile(projectFile))
  const userCredentials = normalizeCredentials(readCredentialFile(file))
  return { ...projectCredentials, ...userCredentials }
}

export function writeCredentials(root, credentials) {
  const file = credentialPath(root)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(normalizeCredentials(credentials), null, 2)}\n`)
}

function readCredentialFile(file) {
  if (!existsSync(file)) return {}
  try {
    return JSON.parse(readFileSync(file, "utf8"))
  } catch {
    return {}
  }
}

function userConfigDir() {
  if (process.env.TWILLIGHT_CONFIG_DIR) return process.env.TWILLIGHT_CONFIG_DIR
  if (process.platform === "win32") return join(process.env.APPDATA || join(homedir(), "AppData", "Roaming"), "Twillight")
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "twillight")
}

export async function getApiKey(root, provider, ui) {
  const keys = await getApiKeys(root, provider, ui)
  return keys[0]
}

export async function getApiKeys(root, provider, ui) {
  const envName = apiKeyEnvName(provider)
  if (!envName) return [""]
  const fromEnv = readEnvKeys(provider)
  if (fromEnv.length) return fromEnv
  const credentials = readCredentials(root)
  const saved = savedKeys(credentials, provider)
  if (saved.length) return saved
  if (!process.stdin.isTTY) throw new Error(`${envName} is missing. Run twillight interactively once to save it.`)
  const value = await promptSecret(`${envName}: `)
  if (!value) throw new Error(`${envName} was not provided.`)
  saveApiKey(root, provider, value)
  ui.dim(`[Twillight] saved ${envName} to ${credentialPath(root)}`)
  return value
}

export function apiKeyEnvName(provider) {
  return providerInfo(provider).keyEnv
}

export function apiKeysEnvName(provider) {
  return providerInfo(provider).keysEnv
}

export function saveApiKey(root, provider, value, options = {}) {
  const envName = apiKeyEnvName(provider)
  if (!envName) throw new Error(`${provider} does not need an API key.`)
  const key = String(value || "").trim()
  if (!isUsableKey(key)) throw new Error(`${envName} was not provided.`)
  const current = readCredentials(root)
  const existing = options.append ? savedKeys(current, provider) : []
  const keys = uniqueKeys([...existing, key])
  writeCredentials(root, { ...current, [envName]: keys[0], [apiKeysEnvName(provider)]: keys })
}

export function hasSavedApiKey(root, provider) {
  return Boolean(readEnvKeys(provider).length || savedKeys(readCredentials(root), provider).length)
}

export function savedApiKeyCount(root, provider) {
  return uniqueKeys([...readEnvKeys(provider), ...savedKeys(readCredentials(root), provider)]).length
}

export function maskKey(value) {
  const key = String(value || "").trim()
  if (!key) return "none"
  if (key.length <= 10) return `${key.slice(0, 2)}...${key.slice(-2)}`
  return `${key.slice(0, 7)}...${key.slice(-4)}`
}

function readEnvKeys(provider) {
  const values = []
  for (const name of [apiKeysEnvName(provider), ...credentialAliases(apiKeyEnvName(provider))].filter(Boolean)) {
    const value = process.env[name]
    values.push(...splitKeys(value))
  }
  return uniqueKeys(values)
}

function savedKeys(credentials, provider) {
  const values = []
  const listEnv = apiKeysEnvName(provider)
  if (listEnv) values.push(...splitKeys(credentials[listEnv]))
  for (const name of credentialAliases(apiKeyEnvName(provider)).filter(Boolean)) values.push(...splitKeys(credentials[name]))
  return uniqueKeys(values)
}

function normalizeCredentials(credentials) {
  const result = { ...credentials }
  for (const provider of providerNames()) {
    const canonical = apiKeyEnvName(provider)
    if (!canonical) continue
    const keys = savedKeys(credentials, provider)
    if (keys.length) {
      result[canonical] = keys[0]
      result[apiKeysEnvName(provider)] = keys
    }
    for (const alias of credentialAliases(canonical)) {
      if (alias !== canonical) delete result[alias]
    }
  }
  return result
}

function credentialAliases(canonical) {
  if (canonical === "OPENAI_API_KEY") return ["OPENAI_API_KEY", "OPENAI_KEY", "openaiApiKey", "openai_api_key"]
  if (canonical === "GROQ_API_KEY") return ["GROQ_API_KEY", "GROQ_KEY", "GROQ_TOKEN", "GROQ_API_TOKEN", "groqApiKey", "groq_api_key"]
  if (canonical === "HUGGINGFACE_API_KEY") return ["HUGGINGFACE_API_KEY", "HF_TOKEN", "HF_API_KEY", "HUGGINGFACE_TOKEN", "huggingfaceApiKey"]
  if (canonical === "CEREBRAS_API_KEY") return ["CEREBRAS_API_KEY", "CEREBRAS_KEY", "CEREBRAS_TOKEN", "cerebrasApiKey"]
  if (canonical === "SAMBANOVA_API_KEY") return ["SAMBANOVA_API_KEY", "SAMBANOVA_KEY", "SAMBANOVA_TOKEN", "sambanovaApiKey"]
  if (canonical === "GITHUB_TOKEN") return ["GITHUB_TOKEN", "GH_TOKEN", "GITHUB_MODELS_TOKEN", "githubToken"]
  return ["OPENROUTER_API_KEY", "OPENROUTER_KEY", "OPENROUTER_TOKEN", "OPENROUTER_API_TOKEN", "openrouterApiKey", "openrouter_api_key"]
}

function isUsableKey(value) {
  const key = String(value || "").trim()
  return Boolean(key && key !== "your_new_key_here" && !/^<[^>]+>$/.test(key))
}

function splitKeys(value) {
  if (Array.isArray(value)) return value.flatMap(splitKeys)
  return String(value || "")
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(isUsableKey)
}

function uniqueKeys(keys) {
  return [...new Set(keys.map((key) => String(key || "").trim()).filter(isUsableKey))]
}

export async function promptSecret(prompt) {
  const output = new Writable({
    write(chunk, _encoding, callback) {
      const text = chunk.toString()
      if (text.includes(prompt)) process.stdout.write(prompt)
      callback()
    },
  })
  const rl = readline.createInterface({ input: process.stdin, output, terminal: true })
  const answer = await rl.question(prompt).then((value) => value.trim())
  rl.close()
  process.stdout.write("\n")
  return answer
}
