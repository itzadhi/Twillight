import { rgb, theme } from "../utils/terminal.mjs"

export const virtualComponents = [
  "Text",
  "Box",
  "Input",
  "Textarea",
  "Select",
  "TabSelect",
  "ScrollBox",
  "ScrollBar",
  "Slider",
  "Code",
  "Markdown",
  "Line numbers",
  "FrameBuffer",
  "ASCIIFont",
  "Diff",
  "QR Code",
]

export function renderComponentShowcase(ui, state) {
  ui.box("components", [
    ui.row("count", String(virtualComponents.length)),
    ui.row("mode", state.uiEngine?.mode || "node20-virtual-opentui"),
    ui.row("layout", "compact registry"),
    ui.row("list", virtualComponents.join(" · ")),
  ])
  ui.box("preview", [
    `${rgb(theme.text, "Text")} ${rgb(theme.muted, "inside")} ${rgb(theme.text, "Box")}`,
    `${rgb(theme.text, "Input")} ${rgb(theme.muted, "and")} ${rgb(theme.text, "Textarea")} ${rgb(theme.muted, "share one prompt surface")}`,
    `${rgb(theme.text, "Select")} ${rgb(theme.muted, "powers")} ${rgb(theme.text, "/cmd")} ${rgb(theme.muted, "with TabSelect in the top bar")}`,
    `${rgb(theme.text, "Code Markdown Diff QR Frame")} ${rgb(theme.muted, "are available on demand")}`,
  ])
  return true
}
