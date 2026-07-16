import { terminalTools } from "./terminal.mjs"

export function gitTools() {
  const runCommand = terminalTools()[0].run
  return [
    {
      name: "git_status",
      description: "Show git status",
      permission: "read-only",
      run(state) {
        return runCommand({ ...state, config: { ...state.config, permissionMode: "standard" } }, { command: "git status --short" })
      },
    },
    {
      name: "git_diff",
      description: "Show git diff",
      permission: "read-only",
      run(state) {
        return runCommand({ ...state, config: { ...state.config, permissionMode: "standard" } }, { command: "git diff --stat" })
      },
    },
  ]
}
