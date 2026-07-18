# Skills

Twillight includes a small built-in skills registry.

Show skills:

```text
/skills
```

Current skills:

```text
project-map
plan-first-build
safe-edit
npm-release
mcp-tools
```

Skills are not separate plugins yet. They are built-in workflow profiles that describe what Twillight should do and which commands/tools are involved.

## Plan First

Large build requests trigger an implementation plan first. You can:

```text
accept
reject
```

or send a revised instruction.

Small actions such as creating folders, moving files, and reading files still execute directly.

## Pets

Pets are lightweight session companions. They are visual, but they also expose a useful state line in the sidebar and explain what they are helping with.

Show the active pet, traits, state, and unlock status:

```text
/pet
```

Switch back to the default companion:

```text
/pet sprite
```

Developer-only dragon:

```text
/dragon
```

The dragon unlocks inside the `itzadhi/Twillight` repository, or when `TWILLIGHT_CREATOR=itzadhi` / `TWILLIGHT_DEV=1` is set. `/doctor` shows exactly why the dragon is locked or unlocked.
