#!/usr/bin/env node
import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { createRegistry } from "../tools/registry.mjs"
import { loadConfig } from "../config/loader.mjs"
import { createRenderer } from "../utils/terminal.mjs"
import { skillList } from "../skills/catalog.mjs"
import { providerInfo, providerNames } from "../providers/catalog.mjs"

const appRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))))
const config = loadConfig(process.argv.slice(2))
const root = config.workspace
const state = {
  root,
  appRoot,
  cwd: config.workspace,
  config,
  ui: createRenderer(""),
  registry: createRegistry(),
  enabledTools: config.enabledTools ? String(config.enabledTools).split(",").map((item) => item.trim()).filter(Boolean) : [],
  changes: [],
  commands: [],
  audit: [],
  backups: [],
}

let buffer = Buffer.alloc(0)
const maxMessageBytes = 1_000_000

process.stdin.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk])
  if (buffer.length > maxMessageBytes * 2) {
    buffer = Buffer.alloc(0)
    return
  }
  while (true) {
    let message
    try {
      message = readMessage()
    } catch (error) {
      buffer = Buffer.alloc(0)
      reply(null, null, { code: -32700, message: error.message || String(error) })
      break
    }
    if (!message) break
    handle(message).catch((error) => reply(message.id, null, { code: -32000, message: error.message || String(error) }))
  }
})

async function handle(message) {
  if (message.method === "initialize") {
    return reply(message.id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {}, resources: {}, prompts: {} },
      serverInfo: { name: "twillight-mcp", version: "1.1.0" },
    })
  }
  if (message.method === "tools/list") {
    return reply(message.id, {
      tools: state.registry.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        annotations: { permission: tool.permission || "read-only" },
        inputSchema: tool.inputSchema || { type: "object", additionalProperties: true },
      })),
    })
  }
  if (message.method === "resources/list") {
    return reply(message.id, {
      resources: [
        { uri: "twillight://workspace", name: "Workspace", mimeType: "application/json" },
        { uri: "twillight://providers", name: "Providers", mimeType: "application/json" },
        { uri: "twillight://skills", name: "Skills", mimeType: "application/json" },
      ],
    })
  }
  if (message.method === "resources/read") {
    const uri = message.params?.uri
    if (uri === "twillight://workspace") return reply(message.id, resource(uri, { root, cwd: state.cwd, appRoot }))
    if (uri === "twillight://providers") return reply(message.id, resource(uri, providerNames().map((name) => ({ name, ...providerInfo(name) }))))
    if (uri === "twillight://skills") return reply(message.id, resource(uri, skillList()))
    return reply(message.id, null, { code: -32602, message: `Unknown resource: ${uri}` })
  }
  if (message.method === "prompts/list") {
    return reply(message.id, {
      prompts: [
        { name: "implementation_plan", description: "Plan first, wait for accept/revise/reject, then build." },
        { name: "safe_code_review", description: "Review bugs, vulnerabilities, missing tests, and fixes." },
      ],
    })
  }
  if (message.method === "prompts/get") {
    const name = message.params?.name
    if (name === "implementation_plan") return reply(message.id, prompt(name, "Create a concise implementation plan with steps, risks, files to touch, and validation. Wait for accept/revise/reject before editing."))
    if (name === "safe_code_review") return reply(message.id, prompt(name, "Inspect the code for bugs, vulnerabilities, fragile logic, missing tests, and give concrete fixes."))
    return reply(message.id, null, { code: -32602, message: `Unknown prompt: ${name}` })
  }
  if (message.method === "tools/call") {
    const { name, arguments: args = {} } = message.params || {}
    const result = state.registry.run(state, name, args)
    return reply(message.id, { content: [{ type: "text", text: stringify(result) }] })
  }
  if (message.id !== undefined) return reply(message.id, null, { code: -32601, message: `Unknown method: ${message.method}` })
}

function readMessage() {
  const headerEnd = buffer.indexOf("\r\n\r\n")
  if (headerEnd === -1) return null
  const header = buffer.slice(0, headerEnd).toString("utf8")
  const length = Number(header.match(/Content-Length:\s*(\d+)/i)?.[1] || 0)
  if (length > maxMessageBytes) throw new Error("MCP message is too large.")
  if (!length || buffer.length < headerEnd + 4 + length) return null
  const body = buffer.slice(headerEnd + 4, headerEnd + 4 + length).toString("utf8")
  buffer = buffer.slice(headerEnd + 4 + length)
  return JSON.parse(body)
}

function reply(id, result, error) {
  if (id === undefined || id === null) return
  const payload = JSON.stringify({ jsonrpc: "2.0", id, ...(error ? { error } : { result }) })
  process.stdout.write(`Content-Length: ${Buffer.byteLength(payload)}\r\n\r\n${payload}`)
}

function stringify(value) {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2)
}

function resource(uri, value) {
  return { contents: [{ uri, mimeType: "application/json", text: stringify(value) }] }
}

function prompt(name, text) {
  return { description: name, messages: [{ role: "user", content: { type: "text", text } }] }
}
