# BarkDown

The core renderer is published as `@raggle-ai/barkdown` on npm.

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

Markdown rendering includes GitHub-flavored Markdown, syntax highlighting, KaTeX formulas, GitHub emoji shortcodes, and fenced Mermaid diagrams. The stylesheet contains their default visual treatment and the code-copy controls. You can override it with normal CSS by targeting `[data-barkdown]` or passing `className`/`style` to the component.

Pass `collapsibleHeadings` to turn each heading into a section control. The section contains content until the next heading of the same or a higher level, child sections nest inside their parent, and every heading gets a stable ID. The control is a real button with `aria-expanded` and `aria-controls`, and sections are open by default. The option defaults to off; `BarkdownExplorer` turns it on for full document views.

```tsx
<BarkdownContent mode="markdown" value={value} collapsibleHeadings />
```

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
