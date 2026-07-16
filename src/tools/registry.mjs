import { filesystemTools } from "./filesystem.mjs"
import { gitTools } from "./git.mjs"
import { searchTools } from "./search.mjs"
import { terminalTools } from "./terminal.mjs"
import { assertPermission } from "../security/permissions.mjs"

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
      if (state.enabledTools?.length && !state.enabledTools.includes(name)) throw new Error(`Tool disabled: ${name}. Enable it with /tool on ${name} or /tool-preset all.`)
      const started = Date.now()
      const tool = this.get(name)
      if (tool.permission) assertPermission(state, tool.permission, name)
      const result = tool.run(state, input)
      state.audit.push({ tool: name, input: redactInput(input), ms: Date.now() - started })
      return result
    },
  }
}

function redactInput(input) {
  if (!input || typeof input !== "object") return input
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => (/key|token|secret|password/i.test(key) ? [key, "[redacted]"] : [key, value])),
  )
}
