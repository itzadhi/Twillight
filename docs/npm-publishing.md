# npm Publishing

The package name is:

```text
twillight
```

The CLI bins are:

```text
twillight
twilight
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

If Windows does not recognize the command immediately, open a new terminal so the npm global PATH refreshes. The package also exposes `twilight` as an alias.

## Versioning

Before publishing updates:

```bat
npm version patch
npm publish --access public
```

Use `minor` for new features and `major` for breaking changes.
