---
name: barkdown-embed
description: Write and preview BarkDown documents with rendered Markdown, code, math, Mermaid, media, and linked local files.
---

# BarkDown Embed

Use this skill for all BarkDown document rendering and preview work. Save the
source as `.md` or `.markdown`; `.mdx` is not supported.

## Render content in Markdown

- Inline code: `` `pnpm build` ``.
- Source code: use a fenced block with a language label. Supported examples are
  `javascript`, `typescript`, `python`, `bash`, `json`, `css`, and `html`.
  Code is highlighted source with a copy button; it is never executed.
- Mermaid: use a `mermaid` fence. It renders as an SVG diagram in the browser.
  Use stable node IDs and quoted labels. HTML labels, click handlers, zoom,
  download, and PlantUML are not supported.
- Math: use `$E = mc^2$` inline or a display block with `$$` on separate lines.
  BarkDown uses KaTeX. Escape currency dollar signs as `\$20`. Keep display
  formulas outside tables.
- Markdown images render as media cards. Use descriptive alt text. Obsidian
  `![[file.png]]` embeds are not supported.
- Native video can use raw HTML such as:

  ```html
  <video title="Demo" controls preload="metadata" playsinline src="demo.mp4"></video>
  ```

  A poster or `<source>` and `<track>` are also supported. Playback starts when
  expanded and stops when collapsed.
- Supported hosted-video URLs in a Markdown image without an explicit title:
  YouTube, Vimeo, Streamable, and Loom. The alt text becomes the card title.
- Remote iframes use raw HTML with `src` and `title`. They load only when
  expanded and may be blocked by the remote site. Author-supplied sandbox,
  allow, referrer policy, and event handlers are removed.
- Raw `html` fences show HTML source. They do not execute HTML.

## Embed local files

Use a `barkdown-html` fence for one relative local HTML path:

````markdown
```barkdown-html
explainers/diagram.html
```
````

The file must be inside the served folder. It loads in a sandboxed, scrollable
iframe and cannot access the parent page.

Use `barkdown-text` for one relative local text path:

````markdown
```barkdown-text
notes/decision.md
```
````

Markdown files render as Markdown, CSV files render as tables using the first
row as headings, and other supported text files render as escaped source. Do
not paste file contents into these fences. The path is relative to the Markdown
file and must be on one line.

Supported folder-reader files are `.md`, `.markdown`, `.html`, `.htm`, `.txt`,
`.text`, `.json`, `.yaml`, `.yml`, and `.csv`.

## Preview

From the repository root:

```bash
pnpm preview /absolute/path/to/report.md
pnpm preview /absolute/path/to/documents
```

Use one command for the requested file or folder. The server prints the port,
local URL, LAN URL, served root, and selected file. Keep it running while the
preview is needed. To install the global command, run:

```bash
pnpm install:global
barkdown /absolute/path/to/report.md
```

A file input serves its parent folder. Serve a common parent folder when a
Markdown file references companion files in another subfolder.

## Verify and share

Check the printed target and then run, replacing placeholders:

```bash
curl -fsSI --connect-timeout 3 --max-time 5 "http://127.0.0.1:<port>/"
curl -fsS --get --connect-timeout 3 --max-time 5 \
  --data-urlencode "path=<absolute-folder>" \
  "http://127.0.0.1:<port>/api/documents"
```

Confirm the API root and document list. HTTP checks do not prove visual
rendering, so open the printed URL and check the relevant content, expansion,
copy action, formula, diagram, media, or iframe. Use the printed LAN URL for a
phone on the same network; a loopback URL is not phone-accessible. Stop only the
preview process started for this task.

Implementation references: `packages/barkdown/src/renderers/`,
`packages/barkdown/src/react.tsx`, `scripts/preview.mjs`,
`apps/preview/vite.config.ts`, and `packages/barkdown/src/node.ts`.
