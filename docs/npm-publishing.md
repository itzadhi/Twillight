# npm Publishing

The package name is:

```text
twillight
```

The CLI bins are:

```text
twillight
twillight-mcp
```

## Prepublish Checks

```bat
npm install
npm test
npm audit
npm pack --dry-run
```

## Local Global Test

```bat
npm link
cd C:\path\to\test-project
twillight
```

## Publish

Log in once:

```bat
npm login
```

Publish:

```bat
npm publish --access public
```

## Install After Publish

```bat
npm install -g twillight
twillight
```

## Versioning

Before publishing updates:

```bat
npm version patch
npm publish --access public
```

Use `minor` for new features and `major` for breaking changes.
