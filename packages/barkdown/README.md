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

The stylesheet contains the default Markdown element treatment for GFM tables, blockquotes, task lists, images, and code-copy controls. You can override it with normal CSS by targeting `[data-barkdown]` or passing `className`/`style` to the component.

MDX strings are evaluated at runtime, so only render trusted MDX:

```tsx
<BarkdownContent mode="mdx" value={trustedMdx} />
```

## VitePress Mermaid Diagrams

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
