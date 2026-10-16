---
name: barkdown-html
description: Embed HTML sections and interactive companion HTML files in documents shown by the BarkDown preview. Show the exact barkdown-html fence, companion file contents, preview command, and the difference between rendering HTML and displaying its source.
---

# BarkDown HTML

Use this skill to write HTML content for a document shown in the BarkDown
preview. For an interactive visualization inside Markdown, use a companion
HTML file and a `barkdown-html` fence, not an ordinary `html` code fence.

Save the parent document as `.md` or `.markdown`. Put raw HTML tags directly
in that document, without an `html` fence. Keep the `barkdown-html` fence when
embedding a companion file. Copy companion HTML source into the `.html` file
without the example's surrounding code fence.

Choose the HTML path by the required behavior. These paths have different
security rules.

| Content                         | Write                               | Behavior                                                      |
| ------------------------------- | ----------------------------------- | ------------------------------------------------------------- |
| Simple document markup          | Raw HTML in Markdown                | Sanitized; no scripts                                         |
| Interactive local visualization | A single-path `barkdown-html` fence | Isolated iframe; scripts permitted                            |
| Static HTML document            | A separate `.html` or `.htm` file   | Explorer iframe; scripts blocked                              |
| Remote page or player           | Raw `<iframe src="...">`            | Collapsed media card; see [media](../barkdown-media/SKILL.md) |

## Inline HTML sections

Put this directly in `report.md`, without the surrounding `markdown` example
fence. Keep blank lines around block HTML:

```markdown
## Details

<details>
<summary>Show the source</summary>
<p>The source is a local document.</p>
</details>

Continue with normal Markdown here.
```

This is markup, not a full HTML application. `rehype-raw` parses it and
`rehype-sanitize` filters it before rendering. Do not depend on scripts,
event handlers, inline styles, arbitrary classes, or unsafe URLs surviving.
Use the Markdown syntax for ordinary headings, lists, and links.

## Interactive HTML section in Markdown

Create these two files in the served folder:

```text
report.md
diagrams/
  ownership.html
```

In `report.md`, use a fence whose body is exactly one unquoted path:

````markdown
## Ownership diagram

```barkdown-html
diagrams/ownership.html
```
````

The outer fence above only shows the Markdown source. In the actual file, write
only the inner `barkdown-html` fence.

A minimal `diagrams/ownership.html` can contain:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Ownership</title>
    <style>
      body {
        font-family: system-ui;
        padding: 1rem;
      }
    </style>
  </head>
  <body>
    <button id="show" type="button">Show owner</button>
    <p id="owner" hidden>The project team owns this document.</p>
    <script>
      document.getElementById("show").addEventListener("click", () => {
        document.getElementById("owner").hidden = false;
      });
    </script>
  </body>
</html>
```

- Use a relative path from the Markdown document. The companion file must be
  a non-empty HTML document in the same loaded dataset. Serve a common parent
  folder when the companion file is outside the Markdown file's folder.
- Put the path, not HTML source, in the fence. Multiple lines do not resolve.
- The standalone preview resolves the companion path automatically. Do not add
  a React component or an `htmlEmbed` callback to the Markdown file. That
  callback is only needed by applications that use the renderer directly.
- The renderer creates a lazy `srcDoc` iframe with `sandbox="allow-scripts"`.
  It does not grant same-origin access. Do not depend on parent DOM access,
  cookies, or browser storage.
- Keep CSS and JavaScript in the companion file. Relative asset URLs do not
  automatically resolve against that file's disk folder. Use inline assets or
  verified absolute URLs.
- The iframe title comes from the companion filename with separators replaced
  by spaces. This embed is not a collapsed media card.

## Standalone HTML

The explorer loads `.html` and `.htm` as `srcDoc` with an empty sandbox.
Scripts are blocked. A companion visualization opened directly in the sidebar
therefore does not have the same interaction behavior as its Markdown embed.

An ordinary `html` code fence displays source code. It does not run HTML.
Trusted MDX is a separate runtime evaluation path; do not use it to bypass
Markdown sanitization.

## Preview and expected result

From the repository root, run:

```bash
pnpm preview /absolute/path/to/report.md
```

The command serves the Markdown file's parent folder, including
`diagrams/ownership.html`. Open the printed URL with `report.md` selected.
The ownership section shows an embedded page with a **Show owner** button.
Click it to reveal the owner. It must not show the HTML source or just a file
link. The embed is visible without opening a collapsed media row.

If the preview says `HTML visualization not found`, check that the fence body
is one path and that the companion file exists under the served folder. If
source code appears, check that the fence label is `barkdown-html`, not `html`,
and remove any surrounding `markdown` example fence.

Open the HTML file directly from the sidebar only to check its static form;
its scripts are blocked there. Use [barkdown-preview](../barkdown-preview/SKILL.md) to verify
the preview URL.

Implementation references: `CodeBlock` and `markdownSchema` in
[react.tsx](../../../packages/barkdown/src/react.tsx), plus
`resolveEmbeddedHtmlPath` and `DocumentContent` in
[explorer.tsx](../../../packages/barkdown/src/explorer.tsx).
