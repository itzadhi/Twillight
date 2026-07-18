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
    {
      name: "git_branch",
      description: "Show the current git branch",
      permission: "read-only",
      run(state) {
        return runCommand({ ...state, config: { ...state.config, permissionMode: "standard" } }, { command: "git branch --show-current" })
      },
    },
    {
      name: "git_recent_commits",
      description: "Show recent git commits",
      permission: "read-only",
      run(state, input) {
        const count = Math.min(Math.max(Number(input.count || 5), 1), 20)
        return runCommand({ ...state, config: { ...state.config, permissionMode: "standard" } }, { command: `git log --oneline -${count}` })
      },
    },
  ]
}
