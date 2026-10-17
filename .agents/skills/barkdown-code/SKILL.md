---
name: barkdown-code
description: Write code sections for the BarkDown preview. Show the exact Markdown for inline code and highlighted fenced blocks, how to preview the file, and how source-code fences differ from rendered HTML and Mermaid embeds.
---

# BarkDown Code

Use this skill to write code examples in a document shown by the BarkDown
preview. Code examples display source; they do not execute it.

Save the document as `.md` or `.markdown` so the preview loads it as Markdown.

## Write this in `report.md`

````markdown
Run `pnpm build` after a source change.

```javascript
const ready = true;
console.log(ready);
```
````

Copy the example contents into `report.md`, including the inner `javascript`
fence. Do not include the surrounding four-backtick `markdown` fence.

Use `javascript`, `typescript`, `python`, `bash`, `json`, `css`, or `html`
when appropriate. Highlighting uses `rehype-highlight` and the installed
Highlight.js languages. Do not assume that every custom language is registered.

## Special fences and literal examples

- `mermaid` renders a diagram, not a source block. Use
  [barkdown-mermaid](../barkdown-mermaid/SKILL.md) for that syntax.
- `barkdown-html` resolves a companion HTML file. Use
  [barkdown-html](../barkdown-html/SKILL.md) for that syntax.
- `html` displays HTML source; it does not execute it.
- To show a Markdown example that contains triple-backtick fences, wrap it in
  a four-backtick `markdown` fence.
- To show Mermaid source rather than render it, use a `text` fence or an outer
  Markdown example fence.

Code blocks get a copy button by default. Copying removes one final newline;
it does not run the code.
Inline code has no copy button. For a one-line block, add a language label:
an unlabeled single-line fence can follow the inline-code rendering path.

## Preview and expected result

From the repository root, run:

```bash
pnpm preview /absolute/path/to/report.md
```

Open the printed URL. The sentence contains inline code. The JavaScript block
shows highlighted source and a copy button, not console output. Check copied
text, whitespace, and horizontal overflow.

Use [barkdown-preview](../barkdown-preview/SKILL.md) to verify the preview URL.
Implementation reference: `CodeBlock` and `PreBlock` in
[code.tsx](../../../packages/barkdown/src/renderers/code.tsx).
