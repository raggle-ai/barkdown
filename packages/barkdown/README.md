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

## Embedded files and media

Every embed uses one frame: a header with a file badge or thumbnail, the file
name or media title, and three actions in the same order: **Reload**, **Copy
file path** or **Copy URL**, and **Open**. Each action has a tooltip and an
accessible label that includes the name. Document embeds show their content in
a focusable viewport that is `min(520px, 60vh)` tall with a 240 px minimum and
scrolls inside the frame. Media keeps a collapsed card with a separate expand
control and its own aspect ratio.

### Interactive HTML in Markdown

Use a `barkdown-html` fence with one document-relative companion path:

````markdown
```barkdown-html
cli-variations.html
```
````

`BarkdownExplorer` and `BarkdownDocument` resolve companions from their loaded
folder dataset. Hosts that import `BarkdownContent` directly must supply
`htmlEmbed`, an `EmbedReader`:

```tsx
import type { EmbedReader } from "@raggle-ai/barkdown";

const readCompanion: EmbedReader = (path, { reload }) =>
  readTextFile(resolveFromDocument(path), { fresh: reload });

<BarkdownContent mode="markdown" value={value} htmlEmbed={readCompanion} />;
```

The reader receives the fence path, relative to the Markdown document, and
`{ reload: true }` when the user selects Reload. It must then return the
current file content, not a loaded snapshot. It can return the text directly or
return a promise, and must return `undefined` for a missing or refused file and
restrict reads to its permitted folder. Keep the reader stable across renders,
for example with `useCallback`; a new reader identity reads the file again.

BarkDown shows one loading message while a promise is pending, reports missing
files and failed reads, and keeps Reload available after a failure. Results
from an earlier path are ignored, and synchronous reader errors are caught like
rejected promises. The HTML renders in an isolated iframe with
`sandbox="allow-scripts"` and no same-origin access. Reload reads the file
again and restarts the embedded page. **Copy file path** resolves the companion
next to the Markdown file's `headingCopyPath`, or copies the relative companion
path when no document path is available. **Open** shows the same HTML in a
full-window page that keeps the same sandbox; a raw HTML file URL is never
used. The link uses normal browser behaviour: click for the current tab,
Command-click or Ctrl-click for a new tab. Standalone HTML documents in the
explorer remain script-blocked.

### External text files in Markdown

Use a `barkdown-text` fence with one document-relative file path:

````markdown
```barkdown-text
notes/decision.md
```
````

`.md` and `.markdown` files render as sanitized, formatted Markdown. CSV files
render as tables; the first row supplies the column headings, and quoted fields
can contain commas, quotes, and newlines. Cell markup stays text. TXT, JSON,
and YAML files show escaped source text. Empty files are valid. Hosts that use
`BarkdownContent` directly supply `textEmbed`, with the same `EmbedReader`
contract as `htmlEmbed`; one reader can serve both props.

**Open** for a text file needs a host page. Pass `embedUrl`, which receives the
fence path and returns the URL of the page that shows that file:

```tsx
<BarkdownContent
  mode="markdown"
  value={value}
  textEmbed={readCompanion}
  embedUrl={(path) => `/documents?file=${encodeURIComponent(resolve(path))}`}
/>
```

The explorer supplies its own `?file=` page, where Markdown stays formatted and
CSV stays a table. Without `embedUrl`, the Open action of text embeds is
disabled.

### Media

Images, native video, hosted players (YouTube, Vimeo, Streamable, Loom), and
raw `<iframe>` pages render as collapsed cards with the same header and actions.
The expand control is separate from the actions. Expanding mounts the full
image, video, or player; collapsing unmounts it, which stops playback. **Copy**
and **Open** use the original source: the local path, resolved next to
`headingCopyPath`, for a local file, or the original URL for a remote source,
including the watch URL of a hosted video rather than its player URL. **Reload**
remounts an expanded view and resets video playback; while collapsed it only
refreshes the thumbnail and does not start a player. A media element without a
source shows a missing-source message with Copy, Open, and expand disabled.
GitHub emoji images stay inline. Media files load through the browser, never
through the text reader.

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
