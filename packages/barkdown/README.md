# BarkDown

The core renderer is published as `@raggle-ai/barkdown` on npm.

BarkDown is maintained by Raggle as an independent project. It was forked from
[volca/markdown-preview](https://github.com/volca/markdown-preview); see
[NOTICE.md](https://github.com/raggle-ai/barkdown/blob/master/NOTICE.md) for
attribution.

```bash
pnpm add @raggle-ai/barkdown
```

Use the React renderer for Markdown or trusted MDX strings:

```tsx
import { BarkdownContent } from "@raggle-ai/barkdown";
import "@raggle-ai/barkdown/styles.css";

export function Preview({ value }: { value: string }) {
  return <BarkdownContent mode="markdown" value={value} />;
}
```

Markdown rendering includes GitHub-flavored Markdown, sanitized inline HTML, syntax highlighting, KaTeX formulas, GitHub emoji shortcodes, and fenced Mermaid diagrams. The stylesheet contains their default visual treatment and the code-copy controls. You can override it with normal CSS by targeting `[data-barkdown]`, passing `className`/`style` to the component, or changing the `--barkdown-link-color`, `--barkdown-link-hover-color`, `--barkdown-focus-color`, and `--barkdown-muted-color` custom properties.

Pass `collapsibleHeadings` to turn each heading into a section control. The section contains content until the next heading of the same or a higher level, child sections nest inside their parent, and every heading gets a stable ID. The control is a real button with `aria-expanded` and `aria-controls`, and sections are open by default. The option defaults to off, and headings render as plain, non-interactive text unless it is on.

```tsx
<BarkdownContent mode="markdown" value={value} collapsibleHeadings />
```

## Interactive HTML in Markdown

Use a `barkdown-html` fence with one document-relative companion path:

````markdown
```barkdown-html
cli-variations.html
```
````

`BarkdownExplorer` and `BarkdownDocument` resolve companions from their loaded
folder dataset. Hosts that import `BarkdownContent` directly must supply
`htmlEmbed`. The resolver can return HTML immediately or return a promise:

```tsx
<BarkdownContent mode="markdown" value={value} htmlEmbed={readCompanionHtml} />
```

The host reader must resolve the path relative to the Markdown document and
restrict reads to its permitted folder. Return `undefined` for missing or
refused files. Keep the reader stable across renders, for example with
`useCallback`.

BarkDown shows a loading state while a promise is pending, reports missing
files and failed reads, and renders the HTML in an isolated iframe with
`sandbox="allow-scripts"`. The preview bar has three icons: **Reload HTML**,
**Copy HTML file path**, and **Open HTML**. Reload calls the reader again and
restarts the embedded page, including when the returned HTML has not changed.
The reload control also remains available after a failed read. A host reader
should read the current file on each call so saved edits appear on reload.
The copy icon uses the Markdown file's
`headingCopyPath` to copy the companion's local path, or copies the relative
companion path when no document path is available. The link uses normal browser
behaviour: click for the current tab, Command-click or Ctrl-click for a new tab.
The embedded preview has a 320 px minimum height on all screen sizes. Use the
link for a full-window preview. The full preview keeps the same isolation and
does not grant access to the host page. Standalone HTML documents in the explorer
remain script-blocked.

## External text files in Markdown

Use a `barkdown-text` fence with one document-relative file path:

````markdown
```barkdown-text
notes/decision.md
```
````

The explorer resolves the file from its loaded folder dataset. `.md` and
`.markdown` files render as formatted Markdown. CSV files render as tables;
the first row supplies the column headings, and quoted fields can contain
commas, quotes, and newlines. TXT, JSON, and YAML files show escaped source
text. Each view has a bounded, scrollable viewport. Empty files are valid.
Hosts that use `BarkdownContent` directly must supply a stable `textEmbed`
reader with the same return type and folder restrictions as `htmlEmbed`.
Pending and rejected reads show a status message.

## Folder explorer

```tsx
import { BarkdownExplorer } from "@raggle-ai/barkdown/explorer";
import "@raggle-ai/barkdown/explorer.css";

const source = {
  read: async () => fetch("/api/documents").then((response) => response.json()),
};

export function App() {
  return <BarkdownExplorer source={source} />;
}
```

Use `readFolder` from `@raggle-ai/barkdown/node` to read Markdown, HTML, and text files. Use `barkdownPlugin` from `@raggle-ai/barkdown/vite` in a Vite development server.

MDX strings are evaluated at runtime, so only render trusted MDX:

```tsx
<BarkdownContent mode="mdx" value={trustedMdx} />
```

## VitePress Mermaid diagrams

Barkdown also ships a VitePress Mermaid renderer. Register the component in your theme and install the Markdown fence renderer in your VitePress config:

```ts
import { renderMermaidDiagrams } from "@raggle-ai/barkdown/vitepress";

export default {
  markdown: {
    config(md) {
      renderMermaidDiagrams(md);
    },
  },
};
```

```ts
import { BarkdownMermaid } from "@raggle-ai/barkdown/vitepress";
import "@raggle-ai/barkdown/styles.css";

export default {
  enhanceApp({ app }) {
    app.component("BarkdownMermaid", BarkdownMermaid);
  },
};
```

The renderer uses the official `mermaid` package and adds a scrollable canvas with zoom, fullscreen, source copy, and SVG download controls. Product sites should keep their visual treatment in CSS by overriding the `[data-barkdown-mermaid]` custom properties.
