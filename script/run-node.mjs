#!/usr/bin/env node
import { appendFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const workspace = process.cwd()
const logs = join(workspace, ".ai", "logs")
mkdirSync(logs, { recursive: true })

const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-")
const logPath = join(logs, `twillight-${stamp}-${process.pid}.log`)
process.env.TWILLIGHT_LOG = logPath
process.env.TWILLIGHT_WRAPPED = "1"

function log(line = "") {
  appendFileSync(logPath, `${line}\n`)
  if (process.env.TWILLIGHT_VERBOSE_STARTUP === "1") console.log(line)
}

log(`[Twillight] Starting in ${workspace}`)
log(`[Twillight] App: ${appRoot}`)
log(`[Twillight] Log: ${logPath}`)
log(`[Twillight] Node: ${process.version}`)

const { main } = await import("../src/cli/index.mjs")
await main(process.argv.slice(2))
