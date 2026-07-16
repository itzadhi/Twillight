export const modes = ["read-only", "workspace", "standard", "full-access"]

export function assertPermission(state, requirement, target = "") {
  const mode = state.config?.permissionMode || "standard"
  const current = modes.indexOf(mode)
  const needed = modes.indexOf(requirement)
  if (current === -1) throw new Error(`Unknown permission mode: ${mode}`)
  if (needed === -1) throw new Error(`Unknown permission requirement: ${requirement}`)
  if (current < needed) throw new Error(`Permission denied: ${requirement} required for ${target || "this action"}`)
}
