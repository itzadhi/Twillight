import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { randomUUID } from "node:crypto"

export function createSessionStore(root) {
  const dir = join(root, ".ai", "sessions")
  mkdirSync(dir, { recursive: true })
  return {
    create(task) {
      const id = randomUUID().slice(0, 8)
      const session = { id, task, createdAt: new Date().toISOString(), messages: [], changes: [], commands: [] }
      writeFileSync(join(dir, `${id}.json`), JSON.stringify(session, null, 2))
      writeFileSync(join(dir, "latest"), id)
      return session
    },
    save(session) {
      writeFileSync(join(dir, `${session.id}.json`), JSON.stringify(session, null, 2))
      writeFileSync(join(dir, "latest"), session.id)
    },
    list() {
      return readdirSync(dir).filter((file) => file.endsWith(".json")).map((file) => JSON.parse(readFileSync(join(dir, file), "utf8")))
    },
    load(id) {
      const actual = id === "latest" && existsSync(join(dir, "latest")) ? readFileSync(join(dir, "latest"), "utf8").trim() : id
      return JSON.parse(readFileSync(join(dir, `${actual}.json`), "utf8"))
    },
  }
}
