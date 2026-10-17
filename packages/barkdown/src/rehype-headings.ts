/**
 * Rehype plugin that gives headings their stable ID and source line.
 *
 * IDs come from the document index, matched by source line, so the outline,
 * fragment links, and placeholder headings of unrendered sections all agree
 * with the rendered element. Headings the index does not list (inside list
 * items or blockquotes) get a text-based fallback ID that cannot collide with
 * an index ID and that stays stable across re-renders of the same line.
 *
 * hast keeps `position.start.line` relative to the rendered text. When the
 * text is a slice of the document, `firstLine` converts to absolute lines.
 * The line is exposed as `data-barkdown-line` for `path:line` references and
 * `#L<line>` deep links. Headings also get `tabindex="-1"` so navigation can
 * move focus to them.
 */
import type { DocumentHeading, DocumentIndex } from "./document-index.js";
import { HeadingIdRegistry } from "./heading-ids.js";

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

type HastNode =
  HastElement | HastText | { type: string; children?: HastNode[] };

interface HastRoot {
  type: "root";
  children: HastNode[];
}

export type RehypeHeadingsOptions = {
  index?: DocumentIndex;
  /** 1-based source line of the first line of the rendered text. */
  firstLine?: number;
};

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

type IndexState = {
  byLine: Map<number, DocumentHeading>;
  registry: HeadingIdRegistry;
  fallback: Map<number, string>;
};

const states = new WeakMap<DocumentIndex, IndexState>();
const detached: IndexState = {
  byLine: new Map(),
  registry: new HeadingIdRegistry(),
  fallback: new Map(),
};

function stateFor(index: DocumentIndex | undefined): IndexState {
  if (!index) return detached;
  let state = states.get(index);
  if (!state) {
    const registry = new HeadingIdRegistry();
    for (const heading of index.headings) registry.reserve(heading.id);
    state = {
      byLine: new Map(index.headings.map((heading) => [heading.line, heading])),
      registry,
      fallback: new Map(),
    };
    states.set(index, state);
  }
  return state;
}

function textOf(node: HastNode): string {
  if (node.type === "text") return (node as HastText).value;
  return "children" in node ? (node.children ?? []).map(textOf).join("") : "";
}

export function rehypeHeadings(options: RehypeHeadingsOptions = {}) {
  const { index, firstLine = 1 } = options;
  const state = stateFor(index);

  const stamp = (node: HastNode): void => {
    if (node.type !== "element") return;
    const element = node as HastElement;
    if (HEADING_TAGS.has(element.tagName)) {
      const relative = element.position?.start?.line;
      const line = relative ? relative + firstLine - 1 : undefined;
      if (element.properties.id === "footnote-label" && firstLine !== 1) {
        // Each independently rendered chunk gets its own footnote list.
        element.properties.id = `footnote-label-${firstLine}`;
      } else if (
        typeof element.properties.id !== "string" ||
        !element.properties.id
      ) {
        const indexed = line !== undefined ? state.byLine.get(line) : undefined;
        let id = indexed?.id;
        if (!id && line !== undefined) id = state.fallback.get(line);
        if (!id) {
          id = state.registry.id(textOf(element));
          if (line !== undefined) state.fallback.set(line, id);
        }
        element.properties.id = id;
      }
      if (element.properties.tabIndex === undefined) {
        element.properties.tabIndex = -1;
      }
      if (line !== undefined) {
        element.properties.dataBarkdownLine = String(line);
      }
    }
    for (const child of element.children) stamp(child);
  };

  return (tree: HastRoot) => {
    for (const child of tree.children) stamp(child);
  };
}
