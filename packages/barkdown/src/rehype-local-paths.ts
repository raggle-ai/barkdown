/**
 * Rehype plugin that linkifies bare local absolute paths in prose.
 *
 * A local absolute path such as `/Users/andrew/project` becomes an anchor
 * `<a class="barkdown-path-link" href="file:///Users/andrew/project">`. The
 * browser handles the navigation; for `file://` URLs BarkDown's content
 * script re-mounts the folder or file viewer.
 *
 * Paths inside inline code (backticks) are linkified too — when the entire
 * code span is a single path, the `<code>` wrapper is replaced by the link.
 * Paths inside `<pre>` blocks, existing `<a>` links, and KaTeX are left alone.
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
}

interface HastRoot {
  type: "root";
  children: HastNode[];
}

type HastNode = HastElement | HastText;

const SKIP_TAGS = new Set([
  "a",
  "pre",
  "kbd",
  "samp",
  "var",
  "annotation",
  "math",
]);

// An absolute Unix path: leading slash, at least two segments, optional
// trailing slash. The first group captures the preceding character (or the
// start of string) so paths inside URLs and other identifiers are not matched.
const PATH_REGEX = /(^|[^\w/:])(\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)+\/?)/g;

// Sentence punctuation that may follow a path in prose. These are trimmed off
// the link and emitted as plain text so the link target stays clean.
const TRAILING_PUNCT = /[.,;:!?)\]}"']+$/;

function isElement(node: HastNode): node is HastElement {
  return node.type === "element";
}

type ResolvedPath = {
  href: string;
  label: string;
  tail: string;
};

function resolvePath(path: string): ResolvedPath {
  const trimmed = path.replace(TRAILING_PUNCT, "");
  return {
    href: `file://${trimmed}`,
    label: trimmed,
    tail: path.slice(trimmed.length),
  };
}

function transformText(value: string): HastNode[] {
  if (!value.includes("/") || !/[A-Za-z0-9._-]/.test(value)) {
    return [{ type: "text", value }];
  }

  const matches = [...value.matchAll(PATH_REGEX)];
  if (matches.length === 0) return [{ type: "text", value }];

  const result: HastNode[] = [];
  let cursor = 0;

  for (const match of matches) {
    const index = match.index ?? 0;
    const prefix = match[1] ?? "";
    const rawPath = match[2] ?? "";

    if (index + prefix.length > cursor) {
      result.push({
        type: "text",
        value: value.slice(cursor, index + prefix.length),
      });
    }

    const { href, label, tail } = resolvePath(rawPath);
    result.push({
      type: "element",
      tagName: "a",
      properties: {
        className: ["barkdown-path-link"],
        href,
      },
      children: [{ type: "text", value: label }],
    });
    if (tail) result.push({ type: "text", value: tail });

    cursor = index + prefix.length + rawPath.length;
  }

  if (cursor < value.length) {
    result.push({ type: "text", value: value.slice(cursor) });
  }

  return result;
}

function extractText(node: HastNode): string {
  if (node.type === "text") return node.value;
  return node.children.map((child) => extractText(child)).join("");
}

const FULL_PATH_REGEX = /^\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)+\/?$/;

function isFullPath(value: string): boolean {
  return FULL_PATH_REGEX.test(value.trim());
}

function linkNode(path: string): HastElement {
  const { href, label } = resolvePath(path.trim());
  return {
    type: "element",
    tagName: "a",
    properties: {
      className: ["barkdown-path-link"],
      href,
    },
    children: [{ type: "text", value: label }],
  };
}

function visit(node: HastElement | HastRoot): void {
  const skip = "tagName" in node && SKIP_TAGS.has(node.tagName);
  if (skip) return;

  const next: HastNode[] = [];
  for (const child of node.children) {
    if (isElement(child) && child.tagName === "code") {
      const text = extractText(child).trim();
      if (isFullPath(text)) {
        next.push(linkNode(text));
        continue;
      }
      visit(child);
      next.push(child);
    } else if (child.type === "text") {
      next.push(...transformText(child.value));
    } else if (isElement(child)) {
      visit(child);
      next.push(child);
    } else {
      next.push(child);
    }
  }
  node.children = next;
}

export function rehypeLocalPaths() {
  return (tree: HastRoot) => {
    visit(tree);
  };
}
