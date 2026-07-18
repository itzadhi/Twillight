export const petCatalog = Object.freeze({
  sprite: {
    title: "Twillight Sprite",
    aliases: ["sprite", "default", "pet"],
    role: "quiet coding companion",
    trait: "Keeps the session readable and nudges you toward the next useful action.",
    idle: "sprite ok",
    busy: "sprite work",
    art: ["   .--.", "  (o  o)  sprite", "  /|\\/|\\", "   /  \\"],
    helps: [
      "shows session mood in the sidebar",
      "points to commands when a workflow stalls",
      "stays available in every project",
    ],
  },
  dragon: {
    title: "Lavender Dragon",
    aliases: ["dragon", "dragom", "dragn", "dragoon", "dev-dragon"],
    role: "developer guardian",
    trait: "Adhi-only project pet that watches risky edits, update state, and local workflow health.",
    idle: "dragon up",
    busy: "dragon guard",
    locked: "dragon lock",
    developerOnly: true,
    art: ["       /\\", "  /\\  /  \\  /\\", " < lavender  dragon >", "  \\/\\____/\\/"],
    helps: [
      "highlights developer identity in /doctor",
      "guards build/update work while tasks run",
      "signals that Twillight is running from the project/dev context",
    ],
  },
})

export function petNames() {
  return Object.keys(petCatalog)
}

export function normalizePetName(value) {
  const text = String(value || "").trim().toLowerCase()
  for (const [name, pet] of Object.entries(petCatalog)) {
    if (name === text || pet.aliases.includes(text)) return name
  }
  return ""
}

export function petInfo(value) {
  return petCatalog[normalizePetName(value)] || petCatalog.sprite
}

export function petAccess(value, isDeveloper = false) {
  const name = normalizePetName(value) || "sprite"
  const pet = petInfo(name)
  const allowed = !pet.developerOnly || Boolean(isDeveloper)
  return {
    name,
    pet,
    allowed,
    activeName: allowed ? name : "sprite",
    activePet: allowed ? pet : petCatalog.sprite,
  }
}

export function petSidebarLine(value, options = {}) {
  const access = petAccess(value, options.isDeveloper)
  if (!access.allowed) return access.pet.locked || "locked"
  return options.processing ? access.pet.busy : access.pet.idle
}
