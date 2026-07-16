# Security

Twillight is designed for local autonomous coding work, so the security model focuses on explicit workspace boundaries, permission levels, and transparent command execution.

## Permission Modes

```text
read-only    inspect only
workspace    edit files inside the workspace
standard     workspace edits plus normal development commands
full-access  broader local actions
```

## Path Policy

Path normalization blocks:

- Empty paths
- Control characters and NUL bytes
- Windows device paths like `\\?\`
- UNC/network paths unless explicitly allowed
- Drive-relative paths like `C:foo.txt`
- Windows alternate data streams like `file.txt:secret`
- Workspace prefix escapes like `V:\project2` when the root is `V:\project`

## Command Policy

Standard mode blocks shell chaining and dangerous commands. Examples:

```text
npm test && del x
git reset --hard
git push --force
rm -rf
rd /s
format C:
diskpart
reg delete
```

Command allowlists match exact commands or a command followed by a space. This prevents `npm test-malicious` from matching an allowlist entry for `npm test`.

## MCP Hardening

The MCP server caps incoming message size and handles parse failures safely.

## Secrets

API keys are saved globally in the user config folder:

```text
%APPDATA%\Twillight\credentials.json
```

Audit logs redact key-like fields.

Do not commit:

```text
.ai
.env
credentials.json
```
