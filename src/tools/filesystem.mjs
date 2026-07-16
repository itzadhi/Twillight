import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import { assertPermission } from "../security/permissions.mjs"
import { normalizePath } from "../security/path-policy.mjs"

export const ignoredFolders = new Set([".git", "node_modules", "dist", "build", "coverage", ".next", ".cache", "venv", ".venv", "__pycache__", "target", "vendor"])

export function filesystemTools() {
  return [
    tool("list_directory", "List directory entries", "read-only", (state, input) => {
      const target = normalizePath(state, input.path || state.cwd, { workspaceOnly: state.config.permissionMode !== "full-access" })
      return readdirSync(target, { withFileTypes: true })
        .filter((entry) => !ignoredFolders.has(entry.name))
        .slice(0, input.limit || 80)
        .map((entry) => ({ type: entry.isDirectory() ? "dir" : "file", name: entry.name }))
    }),
    tool("read_file", "Read a UTF-8 file", "read-only", (state, input) => {
      const target = normalizePath(state, input.path, { workspaceOnly: state.config.permissionMode !== "full-access" })
      if (statSync(target).size > 2_000_000) throw new Error(`File is too large to read safely: ${target}`)
      const content = readFileSync(target, "utf8")
      const lines = content.split(/\r?\n/)
      return {
        path: target,
        content: lines.slice(input.start ? input.start - 1 : 0, input.end || lines.length).join("\n"),
      }
    }),
    tool("write_file", "Write a UTF-8 file atomically", "workspace", (state, input) => {
      const target = normalizePath(state, input.path, { workspaceOnly: state.config.permissionMode !== "full-access" })
      mkdirSync(dirname(target), { recursive: true })
      const existed = existsSync(target)
      const before = existed ? readFileSync(target, "utf8") : ""
      state.backups.push({ path: target, existed, content: before })
      writeFileSync(target, input.content)
      state.changes.push({ type: "write", path: target, before, after: input.content })
      return { path: target, bytes: Buffer.byteLength(input.content) }
    }),
    tool("append_file", "Append text to a file", "workspace", (state, input) => {
      const target = normalizePath(state, input.path, { workspaceOnly: state.config.permissionMode !== "full-access" })
      mkdirSync(dirname(target), { recursive: true })
      const existed = existsSync(target)
      const before = existed ? readFileSync(target, "utf8") : ""
      const after = `${before}${input.content}`
      state.backups.push({ path: target, existed, content: before })
      appendFileSync(target, input.content)
      state.changes.push({ type: "append", path: target, before, after })
      return { path: target, bytes: Buffer.byteLength(input.content) }
    }),
    tool("make_directory", "Create a directory", "workspace", (state, input) => {
      const target = normalizePath(state, input.path, { workspaceOnly: state.config.permissionMode !== "full-access" })
      const existed = existsSync(target)
      state.backups.push({ path: target, existed, content: null })
      mkdirSync(target, { recursive: true })
      state.changes.push({ type: "mkdir", path: target })
      return { path: target, result: existed ? "already exists" : "created" }
    }),
    tool("delete_path", "Delete a file or directory", "workspace", (state, input) => {
      if (!input.confirm) throw new Error("delete_path requires confirm=true")
      const target = normalizePath(state, input.path, { workspaceOnly: state.config.permissionMode !== "full-access" })
      const existed = existsSync(target)
      const before = existed && statSync(target).isFile() ? readFileSync(target, "utf8") : null
      state.backups.push({ path: target, existed, content: before })
      rmSync(target, { recursive: true, force: true })
      state.changes.push({ type: "delete", path: target, before, after: "" })
      return { path: target, result: "deleted" }
    }),
    tool("move_path", "Move or rename a file", "workspace", (state, input) => {
      const from = normalizePath(state, input.from, { workspaceOnly: state.config.permissionMode !== "full-access" })
      const to = normalizePath(state, input.to, { workspaceOnly: state.config.permissionMode !== "full-access" })
      mkdirSync(dirname(to), { recursive: true })
      renameSync(from, to)
      state.changes.push({ type: "move", path: `${from} -> ${to}` })
      return { from, to }
    }),
    tool("copy_path", "Copy a file", "workspace", (state, input) => {
      const from = normalizePath(state, input.from, { workspaceOnly: state.config.permissionMode !== "full-access" })
      const to = normalizePath(state, input.to, { workspaceOnly: state.config.permissionMode !== "full-access" })
      mkdirSync(dirname(to), { recursive: true })
      const existed = existsSync(to)
      const before = existed && statSync(to).isFile() ? readFileSync(to, "utf8") : null
      state.backups.push({ path: to, existed, content: before })
      copyFileSync(from, to)
      state.changes.push({ type: "copy", path: `${from} -> ${to}` })
      return { from, to }
    }),
    tool("path_info", "Get path metadata", "read-only", (state, input) => {
      const target = normalizePath(state, input.path, { workspaceOnly: state.config.permissionMode !== "full-access" })
      const stat = statSync(target)
      return { path: target, type: stat.isDirectory() ? "dir" : "file", bytes: stat.size }
    }),
  ]
}

function tool(name, description, permission, run) {
  return {
    name,
    description,
    permission,
    run(state, input = {}) {
      assertPermission(state, permission, name)
      return run(state, input)
    },
  }
}
