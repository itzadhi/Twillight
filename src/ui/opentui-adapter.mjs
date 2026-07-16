import { readOpenTuiEnv } from "./opentui-env.mjs"

export async function detectOpenTui(options = {}) {
  const envConfig = readOpenTuiEnv(options.env || process.env)
  try {
    const opentui = await import("@opentui/core")
    const nativeRenderer = canUseNativeRenderer(options.nodeVersion)
    return {
      available: true,
      nativeRenderer,
      env: envConfig,
      exports: ["Box", "Text", "Select", "TabSelect", "Diff"].filter((name) => Boolean(opentui[name])),
      note: nativeRenderer ? "native" : nodeMajor(options.nodeVersion) >= 20 ? "node20" : "virtual",
      mode: nativeRenderer ? "native-opentui-renderer" : "node20-virtual-opentui",
      reason: nativeRenderer
        ? "Node runtime supports native OpenTUI renderer."
        : "Node 20 uses Twillight's virtual OpenTUI renderer to avoid Node 26 experimental FFI.",
    }
  } catch (error) {
    return { available: false, nativeRenderer: false, env: envConfig, exports: [], note: "ansi", mode: "ansi", reason: error.message || String(error) }
  }
}

export function canUseNativeRenderer(version = process.versions.node) {
  const [major, minor] = String(version).split(".").map(Number)
  return major > 26 || major === 26 && minor >= 4
}

function nodeMajor(version = process.versions.node) {
  return Number(String(version).split(".")[0] || 0)
}
