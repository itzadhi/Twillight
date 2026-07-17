# Commands

Twillight supports natural chat plus slash commands.

## Core

```text
/help          show help in the same session
/cmd           open command dropdown
/cmds          alias for /cmd
/status        show session state
/clear         clear conversation view
/exit          exit
```

## Files

```text
/files
/read README.md
/write notes.txt -- hello
/append notes.txt -- more
/mkdir test
/rm test
/image C:\path\shot.png
```

Natural equivalents:

```text
create a folder name docs
create file notes.txt with hello
move basis.py file to adhi folder
copy README.md to backup folder
```

## Models And Providers

```text
/models
/use 1
/model cohere/north-mini-code:free
/provider openrouter
/provider groq
/provider huggingface
/provider cerebras
/provider sambanova
/provider github
/provider ollama
/provider openai
/uncensored
/providers
/skills
/pet
/dragon
/doctor
```

## Permissions

```text
/read-only
/workspace
/standard
/full-access
/permission standard
```

## Workflow

```text
/plan-mode
/build-mode
/actions
/tasks
/approve
/reject
/changes
/diff
/undo
/rollback
```

## Git

```text
/git-status
/git-diff
```

## Tool Control

```text
/tools
/tool on read_file
/tool off run_command
/tool-preset all
/tool-preset read
/tool-preset safe
/tool-preset edit
/tool-preset code
/tool-preset autonomous
```

## MCP

```text
/mcp
/mp
```
