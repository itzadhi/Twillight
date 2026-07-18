import { filesystemTools } from "./filesystem.mjs"
import { gitTools } from "./git.mjs"
import { searchTools } from "./search.mjs"
import { terminalTools } from "./terminal.mjs"
import { assertPermission } from "../security/permissions.mjs"

export const ALL_TOOLS = "all"

export function createRegistry() {
  const tools = [...filesystemTools(), ...searchTools(), ...terminalTools(), ...gitTools()]
  return {
    tools,
    get(name) {
      const tool = tools.find((item) => item.name === name)
      if (!tool) throw new Error(`Unknown tool: ${name}`)
      return tool
    },
    run(state, name, input) {
      if (!isToolEnabled(state, name)) throw new Error(`Tool disabled: ${name}. Enable it with /tool on ${name} or /tool-preset all.`)
      const started = Date.now()
      const tool = this.get(name)
      if (tool.permission) assertPermission(state, tool.permission, name)
      const result = tool.run(state, input)
      state.audit.push({ tool: name, input: redactInput(input), ms: Date.now() - started })
      return result
    },
  }
}

export function normalizeEnabledTools(value, registryTools = []) {
  const allNames = registryTools.map((tool) => tool.name)
  if (value === undefined || value === null || value === "" || value === ALL_TOOLS) return [ALL_TOOLS]
  if (Array.isArray(value)) {
    if (!value.length || value.includes(ALL_TOOLS)) return [ALL_TOOLS]
    return uniqueValidTools(value, allNames)
  }
  const parts = String(value).split(",").map((item) => item.trim()).filter(Boolean)
  if (!parts.length || parts.includes(ALL_TOOLS)) return [ALL_TOOLS]
  return uniqueValidTools(parts, allNames)
}

export function isAllToolsEnabled(enabledTools) {
  return !enabledTools?.length || enabledTools.includes(ALL_TOOLS)
}

export function enabledToolNames(state) {
  if (isAllToolsEnabled(state.enabledTools)) return state.registry.tools.map((tool) => tool.name)
  return state.enabledTools
}

function isToolEnabled(state, name) {
  return isAllToolsEnabled(state.enabledTools) || state.enabledTools.includes(name)
}

function uniqueValidTools(value, allNames) {
  const allowed = new Set(allNames)
  return [...new Set(value.map((item) => String(item).trim()).filter((item) => item && (!allowed.size || allowed.has(item))))]
}

function redactInput(input) {
  if (!input || typeof input !== "object") return input
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => (/key|token|secret|password/i.test(key) ? [key, "[redacted]"] : [key, value])),
  )
}
