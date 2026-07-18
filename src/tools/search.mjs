import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { normalizePath } from "../security/path-policy.mjs"
import { ignoredFolders } from "./filesystem.mjs"

export function searchTools() {
  return [
    {
      name: "find_files",
      description: "Find files by name across the workspace",
      permission: "read-only",
      run(state, input) {
        const root = normalizePath(state, input.path || state.cwd, { workspaceOnly: state.config.permissionMode !== "full-access" })
        const query = String(input.query || "").trim().toLowerCase()
        if (!query || query.length > 120) throw new Error("File query is required and must be 120 characters or less.")
        return walk(root)
          .filter((file) => file.toLowerCase().includes(query))
          .slice(0, input.limit || 80)
      },
    },
    {
      name: "search_text",
      description: "Search text across workspace files",
      permission: "read-only",
      run(state, input) {
        const root = normalizePath(state, input.path || state.cwd, { workspaceOnly: state.config.permissionMode !== "full-access" })
        const query = String(input.query || "")
        if (!query || query.length > 200) throw new Error("Search query is required and must be 200 characters or less.")
        const pattern = new RegExp(input.regex ? query : escapeRegExp(query), input.ignoreCase === false ? "g" : "gi")
        return walk(root)
          .flatMap((file) => {
            const text = safeRead(file)
            if (!text || !pattern.test(text)) return []
            pattern.lastIndex = 0
            return [{ file, matches: (text.match(pattern) || []).length }]
          })
          .slice(0, input.limit || 40)
      },
    },
  ]
}

function walk(root) {
  if (!existsSync(root)) return []
  if (!statSync(root).isDirectory()) return [root]
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredFolders.has(entry.name)) return []
    const target = join(root, entry.name)
    if (entry.isDirectory()) return walk(target)
    return [target]
  })
}

function safeRead(file) {
  try {
    if (statSync(file).size > 512_000) return ""
    return readFileSync(file, "utf8")
  } catch {
    return ""
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
