import { appendFileSync } from "node:fs"

export const theme = {
  bg: [11, 10, 18],
  panel: [29, 26, 43],
  input: [24, 22, 35],
  rail: [18, 16, 28],
  line: [169, 139, 216],
  text: [242, 238, 248],
  muted: [111, 94, 139],
  border: [62, 48, 84],
  accent: [199, 166, 255],
  select: [199, 166, 255],
  thought: [199, 166, 255],
  good: [242, 238, 248],
  warn: [235, 188, 186],
  bad: [235, 111, 146],
}

export function rgb(value, text) {
  return `\x1b[38;2;${value[0]};${value[1]};${value[2]}m${text}\x1b[0m`
}

export function bg(value, text) {
  return `\x1b[48;2;${value[0]};${value[1]};${value[2]}m${text}\x1b[0m`
}

export function clean(text) {
  return String(text).replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "")
}

export function createRenderer(logPath) {
  const alternateScreen = envBool("OTUI_USE_ALTERNATE_SCREEN", true)
  const showStats = envBool("OTUI_SHOW_STATS", false)
  const showConsole = envBool("SHOW_CONSOLE", false)
  const notifications = envBool("OPENTUI_NOTIFICATIONS", true)
  const debugInput = envBool("OTUI_DEBUG", false)
  const noNativeRender = envBool("OTUI_NO_NATIVE_RENDER", false)
  function log(text) {
    if (logPath) appendFileSync(logPath, text)
  }
  function debug(line = "") {
    log(`[debug] ${clean(line)}\n`)
  }
  function write(line = "") {
    console.log(line)
    log(`${clean(line)}\n`)
  }
  function print(text) {
    process.stdout.write(text)
    log(clean(text))
  }
  function dim(line = "") {
    write(rgb(theme.muted, line))
  }
  function error(line) {
    write(`${rgb(theme.warn, "[Twillight]")} ${line}`)
  }
  function clear() {
    if (process.stdout.isTTY) process.stdout.write("\x1b[2J\x1b[3J\x1b[H")
  }
  function init() {
    if (alternateScreen && process.stdout.isTTY) process.stdout.write("\x1b[?1049h")
    if (showStats) dim(`[OpenTUI] stats enabled | native=${noNativeRender ? "off" : "auto"} | notifications=${notifications ? "on" : "off"}`)
    if (showConsole) dim("[OpenTUI] console overlay requested; Twillight uses log capture in Node 20 mode.")
    if (debugInput) dim("[OpenTUI] raw input debug enabled.")
  }
  function destroy() {
    if (alternateScreen && process.stdout.isTTY) process.stdout.write("\x1b[?1049l")
  }
  function row(label, value) {
    return `${rgb(theme.muted, label.padEnd(9))} ${rgb(theme.text, String(value))}`
  }
  function box(title, lines) {
    const width = Math.max(title.length + 6, ...lines.map((line) => clean(line).length + 4), 34)
    write(rgb(theme.border, `+-- ${title} ${"-".repeat(width - title.length - 5)}+`))
    for (const line of lines) {
      const plain = clean(line)
      write(`${rgb(theme.border, "|")} ${line}${" ".repeat(width - plain.length - 3)}${rgb(theme.border, "|")}`)
    }
    write(rgb(theme.border, `+${"-".repeat(width - 1)}+`))
  }
  function panel(title, lines, width = 40) {
    const inner = Math.max(8, width - 2)
    const header = ` ${title} `
    const top = `${rgb(theme.border, "╭")}${rgb(theme.border, header.padEnd(inner, "─"))}${rgb(theme.border, "╮")}`
    const body = lines.map((line) => {
      const clipped = clipVisible(line, inner)
      return `${rgb(theme.border, "│")}${clipped}${" ".repeat(Math.max(0, inner - clean(clipped).length))}${rgb(theme.border, "│")}`
    })
    const bottom = `${rgb(theme.border, "╰")}${rgb(theme.border, "─".repeat(inner))}${rgb(theme.border, "╯")}`
    return [top, ...body, bottom]
  }
  function columns(groups, gap = 2) {
    const heights = groups.map((group) => group.length)
    const maxHeight = Math.max(...heights)
    for (let rowIndex = 0; rowIndex < maxHeight; rowIndex += 1) {
      const line = groups.map((group) => {
        const width = Math.max(...group.map((line) => clean(line).length))
        const line = group[rowIndex] || ""
        return `${line}${" ".repeat(Math.max(0, width - clean(line).length))}`
      }).join(" ".repeat(gap))
      write(line)
    }
  }
  function buttons(title, items, selected = -1) {
    const line = items.map((item, index) => {
      const text = `[${item}]`
      return index === selected ? bg(theme.panel, rgb(theme.accent, text)) : rgb(theme.muted, text)
    }).join(" ")
    write(`${rgb(theme.border, title.padEnd(8))} ${line}`)
  }
  function select(title, items, selected = 0) {
    box(title, items.map((item, index) => {
      const marker = index === selected ? ">" : " "
      return `${rgb(index === selected ? theme.accent : theme.muted, `${marker} ${String(index + 1).padStart(2)} `)}${rgb(theme.text, item)}`
    }))
  }
  function diff(title, patch) {
    const lines = String(patch || "").split(/\r?\n/).slice(0, 160).map((line) => {
      if (line.startsWith("+") && !line.startsWith("+++")) return rgb(theme.good, line)
      if (line.startsWith("-") && !line.startsWith("---")) return rgb(theme.bad, line)
      if (line.startsWith("@@")) return rgb(theme.accent, line)
      return rgb(theme.text, line)
    })
    box(title, lines.length ? lines : [row("diff", "no text changes")])
  }
  function spinner(label = "thinking") {
    if (!process.stdout.isTTY) {
      dim(`[Twillight] ${label}...`)
      return () => {}
    }
    const frames = ["   ", ".  ", ".. ", "..."]
    let index = 0
    process.stdout.write(rgb(theme.muted, `[Twillight] ${label}${frames[0]}`))
    const timer = setInterval(() => {
      process.stdout.write(`\r${rgb(theme.muted, `[Twillight] ${label}${frames[index % frames.length]}`)}`)
      index += 1
    }, 140)
    return () => {
      clearInterval(timer)
      process.stdout.write(`\r${" ".repeat(label.length + 18)}\r`)
    }
  }
  return { write, print, dim, error, debug, clear, row, box, panel, columns, buttons, select, diff, spinner, init, destroy }
}

export function unifiedDiff(before, after, file = "file") {
  const oldLines = String(before ?? "").split(/\r?\n/)
  const newLines = String(after ?? "").split(/\r?\n/)
  const width = Math.max(oldLines.length, newLines.length)
  const body = []
  for (let index = 0; index < width; index += 1) {
    const oldLine = oldLines[index]
    const newLine = newLines[index]
    if (oldLine === newLine) {
      if (oldLine !== undefined) body.push(` ${oldLine}`)
    } else {
      if (oldLine !== undefined) body.push(`-${oldLine}`)
      if (newLine !== undefined) body.push(`+${newLine}`)
    }
  }
  return [`--- ${file}`, `+++ ${file}`, "@@ change @@", ...body].join("\n")
}

export function titleCase(text) {
  return `${text.slice(0, 1).toUpperCase()}${text.slice(1)}`
}

export function truncate(text, size) {
  if (String(text).length <= size) return String(text)
  return `${String(text).slice(0, size - 3)}...`
}

export function clipVisible(text, width) {
  const value = String(text)
  let visible = 0
  let output = ""
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "\x1b") {
      const match = value.slice(index).match(/^\x1b\[[0-9;]*m/)
      if (match) {
        output += match[0]
        index += match[0].length - 1
        continue
      }
    }
    if (visible >= width) break
    output += value[index]
    visible += 1
  }
  return output
}

function envBool(name, defaultValue) {
  const value = process.env[name]
  if (value === undefined || value === "") return defaultValue
  return !["0", "false", "off", "no"].includes(String(value).toLowerCase())
}
