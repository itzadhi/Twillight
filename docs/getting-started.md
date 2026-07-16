# Getting Started

Twillight is a Node 20 terminal AI coding client. It runs in the folder you launch it from and treats that folder as the active workspace sandbox.

## Requirements

- Node.js 20 or newer
- npm
- An API key for at least one provider:
  - OpenRouter
  - Groq
  - OpenAI

## Local Development

```bat
npm install
npm test
run.bat
```

You can also launch directly:

```bat
node script\run-node.mjs
```

## Global Install After npm Publish

```bat
npm install -g twillight
cd C:\path\to\your\project
twillight
```

The current directory becomes the workspace. Twillight stores local runtime files in:

```text
.ai\logs
.ai\sessions
.ai\tasks
.ai\memory.json
```

## First API Key

If no key exists, Twillight asks once and saves it globally:

```text
%APPDATA%\Twillight\credentials.json
```

You can also set keys manually:

```bat
set OPENROUTER_API_KEY=your_key
set GROQ_API_KEY=your_key
set OPENAI_API_KEY=your_key
```

## Basic Use

```text
hello
explain this project
create a folder name test
move basis.py file to adhi folder
run command npm test
```

Simple local tasks are executed with local tools instead of wasting a model request.
