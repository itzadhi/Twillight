const dangerous = [
  /format\s+[a-z]:/i,
  /diskpart/i,
  /bcdedit/i,
  /reg\s+(delete|add)/i,
  /shutdown/i,
  /set-executionpolicy/i,
  /git\s+reset\s+--hard/i,
  /git\s+push\s+.*--force/i,
  /remove-item\s+.*-recurse.*-force/i,
  /\brm\s+(-[a-z]*r[a-z]*f|-rf|-fr)\b/i,
  /rd\s+\/s/i,
  /\brmdir\s+\/s/i,
  /\bdel\s+.*\/[sq]/i,
  /\berase\s+.*\/[sq]/i,
  /\btaskkill\s+.*\/f/i,
  /\b(curl|wget|iwr|irm)\b.*\|\s*(sh|bash|powershell|pwsh|cmd)\b/i,
]

export function assertCommandAllowed(state, command) {
  const text = String(command || "").trim()
  if (!text) throw new Error("Command is required.")
  if (dangerous.some((pattern) => pattern.test(text))) {
    if (state.config.permissionMode !== "full-access") throw new Error(`Dangerous command requires full-access: ${text}`)
  }
  if (state.config.permissionMode === "standard" && hasShellControlOperator(text)) {
    throw new Error(`Shell command chaining requires full-access: ${text}`)
  }
  if (state.config.permissionMode === "standard" && state.config.commandAllowlist) {
    const allowed = String(state.config.commandAllowlist)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
    if (allowed.length && !allowed.some((prefix) => commandMatchesAllowedPrefix(text, prefix))) {
      throw new Error(`Command is not in the standard allowlist: ${text}`)
    }
  }
}

export function commandMatchesAllowedPrefix(command, prefix) {
  const normalizedCommand = command.trim().toLowerCase()
  const normalizedPrefix = String(prefix || "").trim().toLowerCase()
  return normalizedCommand === normalizedPrefix || normalizedCommand.startsWith(`${normalizedPrefix} `)
}

export function hasShellControlOperator(command) {
  return /[&|;<>`]|[\r\n]/.test(command)
}
