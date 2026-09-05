# BarkDown

BarkDown is a pnpm workspace with two related surfaces:

- `packages/barkdown` - the public `@raggle-ai/barkdown` React package for Markdown and trusted MDX rendering.
- `extension` - the Chrome extension that renders local Markdown files with its browser-extension renderer.

The extension imports the `@raggle-ai/barkdown` React package through `workspace:*`. This shared package provides one Markdown viewer for both the Chrome extension and Kennel.

## Commands

```bash
pnpm install
pnpm --filter @raggle-ai/barkdown exec playwright install --no-shell chromium
pnpm test
pnpm typecheck
pnpm build
pnpm extension:dist
pnpm preview <markdown-file>
pnpm install:global
```

The Playwright install is a one-time setup for Barkdown's Chromium formatting regression test.

`pnpm build` and `pnpm typecheck` run against the public npm package. `pnpm extension:dist` builds the unpacked extension into `extension/extension-dist/`.

`pnpm preview <markdown-file>` starts a LAN preview and prints a phone-safe
`?file=` link. The phone and computer must use the same local network.

`pnpm install:global` installs a `barkdown` command in `~/.local/bin`, so you
can run `barkdown <markdown-file>` from any folder.

## Publishing

The npm package is published from `packages/barkdown` as `@raggle-ai/barkdown`. The GitHub Actions release workflow installs and verifies from the workspace root, then runs `aube publish --provenance` from the package directory.

## Local Extension

Load `extension/extension-dist` as an unpacked Chrome extension during local development. See [extension/README.md](extension/README.md) for extension-specific setup and feature notes.
