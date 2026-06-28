# BarkDown

BarkDown is a pnpm workspace with two related surfaces:

- `packages/barkdown` - the public `@raggle-ai/barkdown` React package for Markdown and trusted MDX rendering.
- `apps/extension` - the Chrome extension that renders local Markdown files with its browser-extension renderer.

The extension does not import the React package. Keeping the two surfaces separate avoids bundling React into the Manifest V3 content-script path and keeps the npm package focused on application imports.

## Commands

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm extension:lib
pnpm extension:dist
```

`pnpm build` and `pnpm typecheck` run against the public npm package. `pnpm extension:lib` refreshes vendored browser assets for the extension, and `pnpm extension:dist` builds the unpacked extension into `apps/extension/extension-dist/`.

## Publishing

The npm package is published from `packages/barkdown` as `@raggle-ai/barkdown`. The GitHub Actions release workflow installs and verifies from the workspace root, then runs `aube publish --provenance` from the package directory.

## Local Extension

Load `apps/extension` as an unpacked Chrome extension during local development. See [apps/extension/README.md](apps/extension/README.md) for extension-specific setup and feature notes.
