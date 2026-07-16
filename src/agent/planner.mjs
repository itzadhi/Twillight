export function createPlan(task, state) {
  return {
    objective: task || "Interactive assistance",
    steps: [
      "Inspect current workspace context",
      "Route direct filesystem or shell actions to local tools",
      "Use the configured AI model for reasoning when needed",
      "Validate with relevant commands when files changed",
      "Summarize changes and warnings",
    ],
    risks: state.config.permissionMode === "full-access" ? ["Full access enabled"] : [],
  }
}
