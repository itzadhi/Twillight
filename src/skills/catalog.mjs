export const skills = Object.freeze([
  {
    id: "project-map",
    title: "Project Map",
    description: "Inspect files, package metadata, and architecture before coding.",
    commands: ["/files", "/read", "/git-status"],
  },
  {
    id: "plan-first-build",
    title: "Plan First Build",
    description: "Create an implementation plan, wait for accept/revise/reject, then execute.",
    commands: ["/plan-mode", "/approve", "/reject", "/build-mode"],
  },
  {
    id: "safe-edit",
    title: "Safe Edit",
    description: "Checkpoint, edit files, show diff, validate, and allow rollback.",
    commands: ["/changes", "/diff", "/undo", "/rollback"],
  },
  {
    id: "npm-release",
    title: "npm Release",
    description: "Run tests, audit, pack dry-run, and publish the Twillight package.",
    commands: ["npm test", "npm audit", "npm pack --dry-run", "npm publish"],
  },
  {
    id: "mcp-tools",
    title: "MCP Tools",
    description: "Expose Twillight tools to MCP clients through stdio JSON-RPC.",
    commands: ["twillight-mcp", "/mcp"],
  },
])

export function skillList() {
  return skills
}

export function getSkill(id) {
  return skills.find((skill) => skill.id === id)
}
