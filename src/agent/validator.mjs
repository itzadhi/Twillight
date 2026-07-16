import { existsSync } from "node:fs"
import { join } from "node:path"

export function validationCommands(root) {
  if (existsSync(join(root, "package.json"))) return ["node --check script/run-node.mjs", "node --check src/cli/index.mjs"]
  if (existsSync(join(root, "pyproject.toml"))) return ["python -m pytest"]
  if (existsSync(join(root, "Cargo.toml"))) return ["cargo test"]
  if (existsSync(join(root, "go.mod"))) return ["go test ./..."]
  return []
}
