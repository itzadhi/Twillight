import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
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
    tool("list_tree", "List a compact recursive file tree", "read-only", (state, input) => {
      const target = normalizePath(state, input.path || state.cwd, { workspaceOnly: state.config.permissionMode !== "full-access" })
      const limit = clamp(input.limit, 20, 400, 160)
      return walkTree(target, { root: target, limit })
    }),
    tool("read_json", "Read and parse a JSON file", "read-only", (state, input) => {
      const result = filesystemReadFile(state, input)
      return { path: result.path, json: JSON.parse(result.content) }
    }),
    tool("write_file", "Write a UTF-8 file atomically", "workspace", (state, input) => {
      const target = normalizePath(state, input.path, { workspaceOnly: state.config.permissionMode !== "full-access" })
      assertSafeMutation(state, target)
      const content = String(input.content ?? "")
      mkdirSync(dirname(target), { recursive: true })
      const existed = existsSync(target)
      const before = existed ? readFileSync(target, "utf8") : ""
      state.backups.push({ path: target, existed, content: before })
      writeFileSync(target, content)
      state.changes.push({ type: "write", path: target, before, after: content })
      return { path: target, bytes: Buffer.byteLength(content) }
    }),
    tool("write_json", "Write formatted JSON atomically", "workspace", (state, input) => {
      if (!("json" in input)) throw new Error("write_json requires a json field.")
      return filesystemWriteFile(state, {
        path: input.path,
        content: `${JSON.stringify(input.json, null, Number(input.indent || 2))}\n`,
      })
    }),
    tool("append_file", "Append text to a file", "workspace", (state, input) => {
      const target = normalizePath(state, input.path, { workspaceOnly: state.config.permissionMode !== "full-access" })
      assertSafeMutation(state, target)
      const content = String(input.content ?? "")
      mkdirSync(dirname(target), { recursive: true })
      const existed = existsSync(target)
      const before = existed ? readFileSync(target, "utf8") : ""
      const after = `${before}${content}`
      state.backups.push({ path: target, existed, content: before })
      appendFileSync(target, content)
      state.changes.push({ type: "append", path: target, before, after })
      return { path: target, bytes: Buffer.byteLength(content) }
    }),
    tool("make_directory", "Create a directory", "workspace", (state, input) => {
      const target = normalizePath(state, input.path, { workspaceOnly: state.config.permissionMode !== "full-access" })
      assertSafeMutation(state, target)
      const existed = existsSync(target)
      state.backups.push({ path: target, existed, content: null })
      mkdirSync(target, { recursive: true })
      state.changes.push({ type: "mkdir", path: target })
      return { path: target, result: existed ? "already exists" : "created" }
    }),
    tool("delete_path", "Delete a file or directory", "workspace", (state, input) => {
      if (!input.confirm) throw new Error("delete_path requires confirm=true")
      const target = normalizePath(state, input.path, { workspaceOnly: state.config.permissionMode !== "full-access" })
      assertSafeMutation(state, target, { delete: true })
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
      assertSafeMutation(state, from, { delete: true })
      assertSafeMutation(state, to)
      if (!existsSync(from)) throw new Error(`Path not found: ${from}`)
      const destinationExisted = existsSync(to)
      const destinationContent = destinationExisted && statSync(to).isFile() ? readFileSync(to, "utf8") : null
      mkdirSync(dirname(to), { recursive: true })
      renameSync(from, to)
      state.backups.push({ type: "move", from, to, destinationExisted, destinationContent })
      state.changes.push({ type: "move", path: `${from} -> ${to}` })
      return { from, to }
    }),
    tool("copy_path", "Copy a file", "workspace", (state, input) => {
      const from = normalizePath(state, input.from, { workspaceOnly: state.config.permissionMode !== "full-access" })
      const to = normalizePath(state, input.to, { workspaceOnly: state.config.permissionMode !== "full-access" })
      assertSafeMutation(state, to)
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
    tool("paths_info", "Get metadata for multiple paths", "read-only", (state, input) => {
      const paths = Array.isArray(input.paths) ? input.paths : []
      if (!paths.length) throw new Error("paths_info requires paths.")
      return paths.slice(0, 80).map((path) => {
        const target = normalizePath(state, path, { workspaceOnly: state.config.permissionMode !== "full-access" })
        if (!existsSync(target)) return { path: target, exists: false }
        const stat = statSync(target)
        return { path: target, exists: true, type: stat.isDirectory() ? "dir" : "file", bytes: stat.size }
      })
    }),
  ]
}

function filesystemReadFile(state, input) {
  const target = normalizePath(state, input.path, { workspaceOnly: state.config.permissionMode !== "full-access" })
  if (statSync(target).size > 2_000_000) throw new Error(`File is too large to read safely: ${target}`)
  const content = readFileSync(target, "utf8")
  const lines = content.split(/\r?\n/)
  return {
    path: target,
    content: lines.slice(input.start ? input.start - 1 : 0, input.end || lines.length).join("\n"),
  }
}

function filesystemWriteFile(state, input) {
  const target = normalizePath(state, input.path, { workspaceOnly: state.config.permissionMode !== "full-access" })
  assertSafeMutation(state, target)
  const content = String(input.content ?? "")
  mkdirSync(dirname(target), { recursive: true })
  const existed = existsSync(target)
  const before = existed ? readFileSync(target, "utf8") : ""
  state.backups.push({ path: target, existed, content: before })
  writeFileSync(target, content)
  state.changes.push({ type: "write", path: target, before, after: content })
  return { path: target, bytes: Buffer.byteLength(content) }
}

function walkTree(root, options, entries = []) {
  if (entries.length >= options.limit) return entries
  if (!existsSync(root)) return entries
  const stat = statSync(root)
  const rel = relative(options.root, root) || "."
  entries.push({ path: rel, type: stat.isDirectory() ? "dir" : "file", bytes: stat.size })
  if (!stat.isDirectory()) return entries
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entries.length >= options.limit) break
    if (ignoredFolders.has(entry.name)) continue
    walkTree(join(root, entry.name), options, entries)
  }
  return entries
}

function clamp(value, min, max, fallback) {
  const parsed = Number(value || fallback)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

function assertSafeMutation(state, target, options = {}) {
  const normalized = String(target || "").replace(/\\/g, "/").toLowerCase()
  const root = String(state.root || "").replace(/\\/g, "/").toLowerCase().replace(/\/+$/, "")
  if (options.delete && normalized.replace(/\/+$/, "") === root) throw new Error("Refusing to delete the workspace root.")
  if (/(^|\/)\.git(\/|$)/i.test(normalized)) throw new Error("Refusing to mutate .git internals.")
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
