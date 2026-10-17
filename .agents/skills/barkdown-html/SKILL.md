---
name: barkdown-html
description: Embed external HTML files in BarkDown documents.
---

# BarkDown HTML

Use this skill only for embedding an external local HTML file. Put one
relative path in a `barkdown-html` fence:

````markdown
```barkdown-html
explainers/diagram.html
```
````

The file must exist in the served dataset. BarkDown loads it in a sandboxed,
scrollable iframe. It does not render HTML source as Markdown and does not
allow the embedded document to access the parent page.

Use raw HTML only for ordinary sanitized document markup. Use a normal
`html` fence when you want to show HTML source code.

For Markdown, text, JSON, YAML, or other linked text files, use the separate
`barkdown-text` fence instead:

````markdown
```barkdown-text
notes/decision.md
```
````

BarkDown formats `.md` and `.markdown` files with the Markdown renderer. It
shows `.csv` files as tables, with the first row as column headings. Other text
files show escaped source text. Each view has a scrollable viewport. The path
is relative to the Markdown document. Do not paste file contents into the fence.

Preview from the repository root:

```bash
pnpm preview /absolute/path/to/report.md
```

If an embed is missing, check that the path is relative, contains only one
line, and the file is inside the served folder.

Implementation: [code.tsx](../../../packages/barkdown/src/renderers/code.tsx),
[html.tsx](../../../packages/barkdown/src/renderers/html.tsx), and
[text.tsx](../../../packages/barkdown/src/renderers/text.tsx).
