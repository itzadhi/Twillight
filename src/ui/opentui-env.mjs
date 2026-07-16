export const opentuiEnvSchema = [
  ["OTUI_TS_STYLE_WARN", "boolean", false, "Enable warnings for missing syntax styles"],
  ["OTUI_TREE_SITTER_WORKER_PATH", "string", "", "Path to the Tree-sitter worker"],
  ["XDG_CONFIG_HOME", "string", "", "Base directory for user-specific configuration files"],
  ["XDG_DATA_HOME", "string", "", "Base directory for user-specific data files"],
  ["OTUI_PALETTE_IDLE_TIMEOUT_MS", "number", 300, "Milliseconds of silence after palette queries before fallback"],
  ["OTUI_DEBUG_FFI", "boolean", false, "Enable debug logging for FFI bindings"],
  ["OTUI_SHOW_STATS", "boolean", false, "Show the debug overlay at startup"],
  ["OTUI_TRACE_FFI", "boolean", false, "Enable tracing for FFI bindings"],
  ["OPENTUI_FORCE_WCWIDTH", "boolean", false, "Use wcwidth for character width calculations"],
  ["OPENTUI_FORCE_UNICODE", "boolean", false, "Force Mode 2026 Unicode support"],
  ["OPENTUI_GRAPHICS", "boolean", true, "Enable Kitty graphics protocol detection"],
  ["OPENTUI_FORCE_NOZWJ", "boolean", false, "Use Unicode width without ZWJ joining"],
  ["OPENTUI_LIBC", "string", "", "Select Linux native libc package"],
  ["OPENTUI_FORCE_EXPLICIT_WIDTH", "string", "-", "Force explicit width detection"],
  ["OPENTUI_NOTIFICATION_PROTOCOL", "string", "auto", "Force notification protocol"],
  ["OPENTUI_NOTIFICATIONS", "boolean", true, "Enable terminal notification detection"],
  ["OTUI_USE_CONSOLE", "boolean", true, "Enable global console capture"],
  ["SHOW_CONSOLE", "boolean", false, "Open built-in console overlay at startup"],
  ["OTUI_DUMP_CAPTURES", "boolean", false, "Dump captured stdout and console caches on exit"],
  ["OTUI_NO_NATIVE_RENDER", "boolean", false, "Skip the Zig/native frame renderer"],
  ["OTUI_USE_ALTERNATE_SCREEN", "boolean", null, "Force alternate-screen or main-screen mode"],
  ["OTUI_OVERRIDE_STDOUT", "boolean", null, "Force stdout capture or passthrough routing"],
  ["OTUI_DEBUG", "boolean", false, "Capture all raw stdin input for debugging"],
]

export function readOpenTuiEnv(env = process.env) {
  return Object.fromEntries(opentuiEnvSchema.map(([name, type, defaultValue, description]) => {
    const raw = env[name]
    return [name, {
      name,
      type,
      value: raw === undefined || raw === "" ? defaultValue : coerce(raw, type),
      raw: raw ?? "",
      defaultValue,
      description,
      configured: raw !== undefined && raw !== "",
    }]
  }))
}

export function summarizeOpenTuiEnv(config) {
  return Object.values(config).map((item) => `${item.name}=${formatValue(item.value)}${item.configured ? "" : " (default)"}`)
}

function coerce(value, type) {
  if (type === "number") return Number.isFinite(Number(value)) ? Number(value) : 0
  if (type === "boolean") return !["0", "false", "off", "no"].includes(String(value).trim().toLowerCase())
  return String(value)
}

function formatValue(value) {
  if (value === null) return "unset"
  if (value === "") return "\"\""
  return String(value)
}
