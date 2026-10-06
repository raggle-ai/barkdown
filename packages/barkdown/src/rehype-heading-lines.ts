/**
 * Rehype plugin that stamps headings with their Markdown source line.
 *
 * hast elements keep `position.start.line` through the react-markdown
 * pipeline, but positions are not rendered. Copying that line into a
 * `data-barkdown-line` property lets heading components copy a `file:line`
 * reference, in the style of VS Code line references. The plugin runs after
 * `rehype-sanitize`, so the added attribute is never stripped.
 */

interface HastText {
  type: "text";
  value: string;
}

interface HastElement {
  type: "element";
  tagName: string;
  properties: Record<string, unknown>;
  children: HastNode[];
  position?: { start?: { line?: number } };
}

type HastNode = HastElement | HastText;

interface HastRoot {
  type: "root";
  children: HastNode[];
}

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

function stamp(node: HastNode): void {
  if (node.type !== "element") return;

  if (HEADING_TAGS.has(node.tagName) && node.position?.start?.line) {
    node.properties.dataBarkdownLine = String(node.position.start.line);
  }

  for (const child of node.children) stamp(child);
}

export function rehypeHeadingLines() {
  return (tree: HastRoot) => {
    for (const child of tree.children) stamp(child);
  };
}
