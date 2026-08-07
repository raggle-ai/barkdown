# BarkDown Chrome extension

BarkDown is your markdown's best friend. It reads local folders and renders their Markdown, HTML, and text files as clean, searchable pages in Chrome.

It gives teams a simple way to open notes, docs, and generated files without extra setup in each folder. The extension stays focused on one job: turn local files into clear reading views fast.

The local Kennel bridge adds folder-aware preview, so BarkDown can fetch the parent folder and open related files in one shared explorer.

## Build

```sh
pnpm install
pnpm extension:dist
```

Load `extension/extension-dist` as an unpacked extension in Chrome. Enable **Allow access to file URLs**.

Drag a local folder into Chrome to read all supported files in its folder tree. When Chrome opens one Markdown or HTML file, the extension asks the local Kennel bridge to serve its parent folder. Kennel binds this automatic preview to `127.0.0.1`.

BarkDown does not change normal HTML web pages. It only acts on supported local files and the matched preview routes in the manifest.
