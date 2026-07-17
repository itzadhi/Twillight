import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"

const DEFAULT_REGISTRY = "https://registry.npmjs.org"
const require = createRequire(import.meta.url)

export function packageMetadata(appRoot) {
  try {
    const pkg = JSON.parse(readFileSync(join(appRoot, "package.json"), "utf8"))
    return { name: pkg.name || "twillight", version: pkg.version || "0.0.0" }
  } catch {
    return { name: "twillight", version: "0.0.0" }
  }
}

export function isNewerVersion(latest, current) {
  const a = semverParts(latest)
  const b = semverParts(current)
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const next = a[index] || 0
    const now = b[index] || 0
    if (next > now) return true
    if (next < now) return false
  }
  return false
}

export async function checkForUpdate(state, options = {}) {
  if (state.config.updateCheck === false && !options.force) return { checked: false, reason: "disabled" }
  const pkg = packageMetadata(state.appRoot || process.cwd())
  const cache = readUpdateCache(state.root)
  const intervalMs = Math.max(0, Number(state.config.updateCheckIntervalHours ?? 6)) * 60 * 60 * 1000
  if (!options.force && cache.checkedAt && Date.now() - Date.parse(cache.checkedAt) < intervalMs) {
    if (cache.latest && isNewerVersion(cache.latest, pkg.version) && cache.skippedVersion !== cache.latest) {
      return updateInfo(pkg, cache.latest, { cached: true })
    }
    return { checked: false, reason: "cached", current: pkg.version, latest: cache.latest || pkg.version }
  }

  const latest = await fetchLatestVersion(pkg.name, state.config.updateRegistryUrl, options.fetchImpl)
  const nextCache = { checkedAt: new Date().toISOString(), latest }
  if (cache.skippedVersion === latest) nextCache.skippedVersion = latest
  writeUpdateCache(state.root, nextCache)
  if (!isNewerVersion(latest, pkg.version)) return { checked: true, available: false, current: pkg.version, latest }
  if (!options.force && cache.skippedVersion === latest) {
    return { checked: true, available: false, reason: "skipped", current: pkg.version, latest }
  }
  return updateInfo(pkg, latest)
}

export function rememberUpdateSkip(root, info) {
  const cache = readUpdateCache(root)
  writeUpdateCache(root, { ...cache, checkedAt: new Date().toISOString(), latest: info.latest, skippedVersion: info.latest })
}

export function rememberUpdateInstall(root, info) {
  const cache = readUpdateCache(root)
  writeUpdateCache(root, { ...cache, checkedAt: new Date().toISOString(), latest: info.latest, skippedVersion: "" })
}

export function installGlobalUpdate(info) {
  const spec = npmCommandSpec(["install", "-g", `${info.name || "twillight"}@latest`])
  const result = spawnSync(spec.command, spec.args, {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 5,
  })
  return {
    command: spec.display,
    code: result.status ?? (result.error ? 1 : 0),
    stdout: result.stdout || "",
    stderr: result.stderr || result.error?.message || "",
  }
}

export function npmCommandSpec(args = []) {
  const cleanArgs = args.map((arg) => String(arg))
  const cli = npmCliPath()
  if (cli) {
    return {
      command: process.execPath,
      args: [cli, ...cleanArgs],
      display: `npm ${cleanArgs.join(" ")}`.trim(),
    }
  }
  if (process.platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "npm", ...cleanArgs],
      display: `npm ${cleanArgs.join(" ")}`.trim(),
    }
  }
  return {
    command: "npm",
    args: cleanArgs,
    display: `npm ${cleanArgs.join(" ")}`.trim(),
  }
}

export function npmCliPath() {
  const candidates = [
    process.env.npm_execpath,
    safeResolve("npm/bin/npm-cli.js"),
    join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js"),
  ].filter(Boolean)
  return candidates.find((file) => existsSync(file)) || ""
}

function updateInfo(pkg, latest, extra = {}) {
  return {
    ...extra,
    checked: true,
    available: true,
    name: pkg.name,
    current: pkg.version,
    latest,
    command: npmCommandSpec(["install", "-g", `${pkg.name}@latest`]).display,
  }
}

async function fetchLatestVersion(name, registryUrl = DEFAULT_REGISTRY, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") throw new Error("Update check needs fetch support in Node 20+.")
  const base = String(registryUrl || DEFAULT_REGISTRY).replace(/\/+$/, "")
  const response = await fetchImpl(`${base}/${encodeURIComponent(name).replace(/%2F/g, "/")}/latest`, {
    headers: { Accept: "application/json", "User-Agent": "Twillight update-check" },
    signal: AbortSignal.timeout(3500),
  })
  if (!response.ok) throw new Error(`Update check failed: ${response.status} ${response.statusText}`)
  const data = await response.json()
  if (!data?.version) throw new Error("Update check failed: registry did not return a version.")
  return String(data.version)
}

function readUpdateCache(root) {
  const file = updateCachePath(root)
  try {
    return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {}
  } catch {
    return {}
  }
}

function writeUpdateCache(root, data) {
  const file = updateCachePath(root)
  mkdirSync(join(root, ".ai"), { recursive: true })
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
}

function updateCachePath(root) {
  return join(root, ".ai", "update.json")
}

function safeResolve(id) {
  try {
    return require.resolve(id)
  } catch {
    return ""
  }
}

function semverParts(value) {
  return String(value || "0.0.0")
    .split(/[.-]/)
    .map((part) => Number.parseInt(part, 10))
    .map((part) => Number.isFinite(part) ? part : 0)
}
