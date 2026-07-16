import { win32 as pathWin32 } from "node:path"

export function normalizePath(state, value, options = {}) {
  const raw = String(value || "").trim().replace(/^["'`]+|["'`]+$/g, "")
  if (!raw) throw new Error("Path is required.")
  if (/[\0-\x1f<>|?*]/.test(raw)) throw new Error(`Unsafe path: ${raw}`)
  if (/^\\\\[.?]\\/.test(raw)) throw new Error(`Windows device paths are not allowed: ${raw}`)
  if (/^[a-z]:(?![\\/])/i.test(raw)) throw new Error(`Drive-relative paths are not allowed: ${raw}`)
  if (raw.startsWith("\\\\") && !options.allowNetwork) throw new Error(`Network paths require full-access: ${raw}`)
  if (hasUnsafeAlternateDataStream(raw)) throw new Error(`Alternate data streams are not allowed: ${raw}`)
  const target = pathWin32.normalize(pathWin32.isAbsolute(raw) ? raw : pathWin32.join(state.cwd, raw))
  if (options.workspaceOnly && !isInsidePath(state.root, target)) {
    throw new Error(`Path outside workspace: ${target}`)
  }
  return target
}

export function isInsidePath(root, target) {
  const relative = pathWin32.relative(pathWin32.resolve(root), pathWin32.resolve(target))
  return relative === "" || (!relative.startsWith("..") && !pathWin32.isAbsolute(relative))
}

function hasUnsafeAlternateDataStream(raw) {
  const parsed = pathWin32.parse(raw)
  const withoutDrive = parsed.root && /^[a-z]:\\?$/i.test(parsed.root) ? raw.slice(2) : raw
  return withoutDrive.includes(":")
}
