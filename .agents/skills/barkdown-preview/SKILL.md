---
name: barkdown-preview
description: Run, verify, and stop BarkDown preview servers for Markdown, HTML, text files, or folders. Use for barkdown and pnpm preview commands, global command installation, desktop preview URLs, and phone-accessible LAN links.
---

# BarkDown Preview

Use this skill to run the preview server. For document contents and exact embed
syntax, use [barkdown-html](../barkdown-html/SKILL.md),
[barkdown-media](../barkdown-media/SKILL.md),
[barkdown-code](../barkdown-code/SKILL.md),
[barkdown-math](../barkdown-math/SKILL.md), or
[barkdown-mermaid](../barkdown-mermaid/SKILL.md).

## Choose the file or folder

The folder reader loads `.md`, `.markdown`, `.html`, `.htm`, `.txt`, `.text`,
`.json`, `.yaml`, `.yml`, and `.csv`. It does not load `.mdx`.

A file input serves that file's parent folder and selects the file. A folder
input serves the folder and its supported descendants. Serve a common parent
folder when a Markdown document needs companion HTML from another subfolder.

## Run the preview

With the global command installed, run from any folder:

```bash
barkdown /absolute/path/to/report.md
barkdown /absolute/path/to/documents
```

From this repository root, use the local command instead:

```bash
pnpm preview /absolute/path/to/report.md
pnpm preview /absolute/path/to/documents
```

Run one command for the requested target, not all four examples. Keep the server
process running while the user needs the preview.

The command builds the package, starts Vite on all interfaces, and prints a URL
with `path=<absolute-folder>`. A file input also adds `file=<relative-file>`.
Use the printed port; the command selects another port if the starting port
is occupied.

To install or refresh the global command, run from this repository root:

```bash
pnpm install:global
```

This installs `barkdown` in `~/.local/bin`. If the shell cannot find the
installed command, check that directory is on `PATH`.

For development against the app's configured default folder, use `bun dev`
from the repository root. For a specific document or folder, use the preview
command instead.

## Verify before sharing

1. Check the command output for the selected folder, file, port, and LAN URL.
2. Replace the placeholders below with the actual port and absolute folder:

   ```bash
   curl -fsSI --connect-timeout 3 --max-time 5 "http://127.0.0.1:<port>/"
   curl -fsS --get --connect-timeout 3 --max-time 5 \
     --data-urlencode "path=<absolute-folder>" \
     "http://127.0.0.1:<port>/api/documents"
   ```

3. Confirm the API `root` matches the requested folder and `documents` includes
   the selected document and any companion HTML files.
4. For visual verification, open the preview URL in a browser and use the
   relevant content skill's expected result. HTTP checks alone do not prove
   that media, formulas, diagrams, or embedded scripts rendered correctly.

## Share desktop and phone links

For the desktop URL, use `127.0.0.1` with the printed port and preserve the
printed `path` and `file` query parameters. For phone access, return the printed
LAN URL with those same parameters.

The phone and computer must use the same local network. If the printed address
is loopback, it is not a phone-accessible link. If loopback works but the host
cannot reach its own LAN URL, report phone access as unverified.

State which folder or file is served and that the preview server is running.

## Stop the preview

Leave a requested preview running until the user asks to stop it. Stop only the
process started for this preview. For a temporary verification server, stop
that process when verification is complete. Do not stop unrelated Vite servers.

## Implementation references

- [preview.mjs](../../../scripts/preview.mjs): target selection, build, port,
  server process, and LAN URL.
- [install-global.mjs](../../../scripts/install-global.mjs): global command.
- [vite.config.ts](../../../apps/preview/vite.config.ts): preview app server.
- [node.ts](../../../packages/barkdown/src/node.ts): folder reading.
