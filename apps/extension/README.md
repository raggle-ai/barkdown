# BarkDown Extension

BarkDown fetches local Markdown files and renders them as HTML in the browser. The extension uses its own browser-extension renderer and does not import the React npm package.

## Features

- Auto-reload for local Markdown previews
- Custom themes
- GitHub Flavored Markdown
- Export and copy controls
- KaTeX and MathJax support
- Mermaid diagrams
- Font size controls
- Focus mode
- Reading progress

## Local Installation

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Click "Load unpacked".
4. Select `apps/extension`.
5. Enable "Allow access to file URLs" for BarkDown.

## Build

```bash
pnpm extension:lib
pnpm extension:dist
```

`pnpm extension:lib` refreshes vendored browser assets from npm dependencies. `pnpm extension:dist` builds the unpacked extension into `apps/extension/extension-dist/`.

## Math Syntax

BarkDown uses KaTeX to render mathematical expressions. To avoid conflicts with standard Markdown syntax, some LaTeX delimiters are disabled by default but can be enabled in the options.

| Syntax | Notes |
|--------|-------|
| `$math$` | Requires LaTeX delimiters enabled. Escape dollar signs with `\$` |
| `\(math\)` | Requires LaTeX delimiters enabled |
| `\\(math\\)` | Works by default |
| `` $`math`$ `` | Works by default |
| `\[math\]` | Requires LaTeX delimiters enabled |
| `\\[math\\]` | Works by default |
| `$$math$$` | Works by default |
| ` ```math ` | Code block style, works by default |

## Links

- [Change Log](CHANGELOG.md)
- [Wiki / Documentation](docs/WIKI.md)
