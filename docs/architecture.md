# Architecture

Twillight is split into small modules so the terminal UI, agent workflow, providers, tools, and security policy stay separate.

## Main Flow

```text
script/run-node.mjs
  -> src/cli/index.mjs
    -> config loader
    -> session store
    -> provider factory
    -> tool registry
    -> dashboard renderer
    -> agent loop
```

## Important Directories

```text
src/cli        terminal input, queueing, commands, dashboard lifecycle
src/agent      planning, natural local workflow, validation, memory
src/providers  OpenRouter/Groq/OpenAI-compatible chat and model APIs
src/tools      filesystem, search, terminal, git tools
src/security   permissions, path policy, command policy, secret filtering
src/config     defaults, env loading, API key storage
src/storage    session storage
src/ui         dashboard, OpenTUI-compatible virtual components
src/mcp        MCP stdio server
tests          runtime regression tests
```

## Workspace Root

When installed globally with npm, the package code lives in npm's global folder, but the workspace root is still `process.cwd()`.

That means:

- Running `twillight` inside a project gives Twillight control of that project.
- Runtime state is stored in that project under `.ai`.
- Path sandbox checks use the project folder, not the npm install folder.

## Local Workflow Routing

Twillight tries to route obvious local actions before calling the model:

```text
create folder
write file
read file
list files
move file
copy file
delete path
run command
```

This keeps simple actions fast and avoids empty model responses for tasks that do not need the model.

## Model Workflow

For model-backed chat:

1. Build system prompt
2. Add session messages
3. Add user input and optional image
4. Call configured provider
5. Retry non-streaming if streaming returns empty
6. Try fallback models when needed
7. Render final answer in the same session
