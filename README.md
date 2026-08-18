# BarkDown

BarkDown is a pnpm workspace with two related surfaces:

- `packages/barkdown` - the public `@raggle-ai/barkdown` React package for Markdown and trusted MDX rendering.
- `extension` - the Chrome extension that renders local Markdown files with its browser-extension renderer.

The extension imports the `@raggle-ai/barkdown` React package through `workspace:*`. This shared package provides one Markdown viewer for both the Chrome extension and Kennel.

## Commands

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm extension:dist
```

`pnpm build` and `pnpm typecheck` run against the public npm package. `pnpm extension:dist` builds the unpacked extension into `extension/extension-dist/`.

## Publishing

The npm package is published from `packages/barkdown` as `@raggle-ai/barkdown`. The GitHub Actions release workflow installs and verifies from the workspace root, then runs `aube publish --provenance` from the package directory.

## Local Extension

Load `extension/extension-dist` as an unpacked Chrome extension during local development. See [extension/README.md](extension/README.md) for extension-specific setup and feature notes.
