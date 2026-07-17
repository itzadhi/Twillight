# MCP Server

Twillight includes an MCP stdio server.

Run it directly:

```bat
twillight-mcp
```

Or from source:

```bat
node src\mcp\server.mjs
```

Inside Twillight:

```text
/mcp
/mp
```

## Capabilities

The MCP server exposes Twillight tools through `tools/list` and `tools/call`.
It also exposes:

```text
resources/list
resources/read
prompts/list
prompts/get
```

Resources:

```text
twillight://workspace
twillight://providers
twillight://skills
```

Prompts:

```text
implementation_plan
safe_code_review
```

Tool examples:

```text
list_directory
read_file
write_file
append_file
make_directory
move_path
copy_path
delete_path
search_text
run_command
git_status
git_diff
```

## Safety

MCP tool calls use the same permission, path, and command policy as the normal terminal client.
