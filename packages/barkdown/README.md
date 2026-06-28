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
