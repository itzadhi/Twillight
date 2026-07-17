import { spawnSync } from "node:child_process"
import { assertPermission } from "../security/permissions.mjs"
import { assertCommandAllowed } from "../security/command-policy.mjs"
import { normalizePath } from "../security/path-policy.mjs"

export function terminalTools() {
  return [
    {
      name: "run_command",
      description: "Run a development shell command",
      permission: "standard",
      run(state, input) {
        assertPermission(state, "standard", "run_command")
        const command = String(input.command || "").trim()
        if (!command) throw new Error("Command is required.")
        if (command.length > 4000) throw new Error("Command is too long.")
        assertCommandAllowed(state, command)
        const cwd = normalizePath(state, input.cwd || state.cwd, { workspaceOnly: state.config.permissionMode !== "full-access" })
        const result = spawnSync(command, {
          cwd,
          shell: true,
          encoding: "utf8",
          timeout: clampTimeout(input.timeout || input.timeoutMs),
          maxBuffer: 1024 * 1024,
          env: { ...process.env, ...cleanEnv(state, input.env || {}) },
        })
        state.commands.push({ command, code: result.status ?? 1 })
        return { command, code: result.status ?? 1, stdout: result.stdout || "", stderr: result.stderr || "" }
      },
    },
  ]
}

function clampTimeout(value) {
  const timeout = Number(value || 120000)
  if (!Number.isFinite(timeout)) return 120000
  return Math.min(Math.max(timeout, 1000), 300000)
}

function cleanEnv(state, env) {
  return Object.fromEntries(
    Object.entries(env)
      .filter(([key]) => /^[A-Z_][A-Z0-9_]*$/i.test(key))
      .filter(([key]) => state.config.permissionMode === "full-access" || !/(TOKEN|KEY|SECRET|PASSWORD|PASS|AUTH|COOKIE)/i.test(key))
      .map(([key, value]) => [key, String(value)]),
  )
}
