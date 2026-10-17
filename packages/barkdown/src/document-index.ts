/**
 * Document index: title, headings with stable IDs, line and byte metadata,
 * and heading-delimited sections of a Markdown source.
 *
 * The index is built by a single line scan, not a full Markdown parse, so it
 * stays cheap for documents of several megabytes. The scanner follows the
 * CommonMark block rules that decide whether a line is a heading: fenced
 * code, HTML blocks, indented code, ATX headings, and setext underlines. It
 * records structural headings only. A heading nested in a list item or a
 * blockquote is still rendered with an ID by the heading plugin, but it is not
 * an outline entry and does not split a section.
 */
import { BoundedCache } from "./bounded-cache.js";
import { HeadingIdRegistry } from "./heading-ids.js";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type DocumentHeading = {
  /** Stable ID, identical to the rendered heading element's `id`. */
  id: string;
  level: HeadingLevel;
  /** Plain heading text with inline Markdown markers removed. */
  text: string;
  /** 1-based source line of the heading. */
  line: number;
  /** Character offset of the heading line in the source. */
  offset: number;
  /** UTF-8 byte offset of the heading line in the source. */
  byteOffset: number;
  /** Position in `DocumentIndex.headings`. */
  index: number;
  /** Position of the nearest preceding heading with a lower level. */
  parent?: number;
};

export type DocumentSection = {
  index: number;
  /** Heading level, or 0 for content before the first heading. */
  level: number;
  heading?: DocumentHeading;
  /** 1-based inclusive source lines. */
  startLine: number;
  endLine: number;
  /** Character offsets; `end` is exclusive. */
  start: number;
  end: number;
  bytes: number;
};

export type DocumentFrontmatter = {
  startLine: number;
  endLine: number;
  start: number;
  end: number;
  /** YAML between the fences. */
  text: string;
};

export type DocumentIndex = {
  /** Frontmatter `title`, else the first level-1 heading. */
  title?: string;
  headings: DocumentHeading[];
  sections: DocumentSection[];
  frontmatter?: DocumentFrontmatter;
  /** Where the Markdown body starts, after any frontmatter. */
  body: { startLine: number; start: number };
  /**
   * Link reference and footnote definitions found anywhere in the document.
   * A section rendered on its own needs them appended to resolve references
   * defined in another section.
   */
  definitions: string[];
  /** Line count; a trailing newline does not add an empty line. */
  lines: number;
  /** UTF-8 byte length. */
  bytes: number;
  /** UTF-16 code unit length (`text.length`). */
  chars: number;
  /** Character offset of each line start; index 0 is line 1. */
  lineOffsets: number[];
};

export type OutlineNode = {
  heading: DocumentHeading;
  children: OutlineNode[];
};

const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;
const ATX_HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
const ATX_CLOSING = /(?:^|[ \t]+)#+$/;
const SETEXT_UNDERLINE = /^ {0,3}(=+|-+)[ \t]*$/;
const THEMATIC_BREAK =
  /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/;
const LIST_ITEM = /^ {0,3}(?:[-+*]|\d{1,9}[.)])(?:[ \t]|$)/;
const BLOCKQUOTE = /^ {0,3}>/;
const INDENTED = /^(?: {4}|\t)/;
const LINK_DEFINITION =
  /^ {0,3}\[(?!\^)(?:\\.|[^\\[\]]){1,999}\]:[ \t]*(?:<[^>]*>|\S+)/;
const FOOTNOTE_DEFINITION = /^ {0,3}\[\^[^\]\s]+\]:/;
const FRONTMATTER_FENCE = /^---[ \t]*$/;
const FRONTMATTER_END = /^(?:---|\.\.\.)[ \t]*$/;
const HTML_BLOCK_TAGS =
  "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h1|h2|h3|h4|h5|h6|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
const HTML_BLOCK_6 = new RegExp(
  `^ {0,3}</?(?:${HTML_BLOCK_TAGS})(?:[ \\t]|/?>|$)`,
  "i",
);
const HTML_BLOCK_7 =
  /^ {0,3}(?:<[A-Za-z][A-Za-z0-9-]*(?:[ \t]+[A-Za-z_:][A-Za-z0-9_.:-]*(?:[ \t]*=[ \t]*(?:[^ \t"'=<>`]+|'[^']*'|"[^"]*"))?)*[ \t]*\/?>|<\/[A-Za-z][A-Za-z0-9-]*[ \t]*>)[ \t]*$/;
const HTML_BLOCK_STARTS: Array<[RegExp, RegExp]> = [
  [
    /^ {0,3}<(?:script|pre|textarea|style)(?:[ \t]|>|$)/i,
    /<\/(?:script|pre|textarea|style)>/i,
  ],
  [/^ {0,3}<!--/, /-->/],
  [/^ {0,3}<\?/, /\?>/],
  [/^ {0,3}<![A-Za-z]/, />/],
  [/^ {0,3}<!\[CDATA\[/, /\]\]>/],
];

/** UTF-8 byte length of a string without allocating an encoded copy. */
export function utf8Length(text: string): number {
  let bytes = 0;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      index += 1;
    } else bytes += 3;
  }
  return bytes;
}

/** Plain text of a heading's inline Markdown. */
export function headingText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(\*|_)(.+?)\1/g, "$2")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/\\([\\`*_{}[\]()#+\-.!>|~])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

type Paragraph = {
  startLine: number;
  offset: number;
  byteOffset: number;
  lines: string[];
};

export function indexDocument(text: string): DocumentIndex {
  const rawLines = text === "" ? [] : text.split("\n");
  if (text.endsWith("\n")) rawLines.pop();
  const lineOffsets: number[] = new Array<number>(rawLines.length);
  const headings: DocumentHeading[] = [];
  const definitions: string[] = [];
  const registry = new HeadingIdRegistry();
  const levelStack: number[] = [];

  let frontmatter: DocumentFrontmatter | undefined;
  let frontmatterEnd = -1;
  if (
    rawLines.length > 1 &&
    FRONTMATTER_FENCE.test(stripReturn(rawLines[0]!))
  ) {
    for (let index = 1; index < rawLines.length; index += 1) {
      if (FRONTMATTER_END.test(stripReturn(rawLines[index]!))) {
        frontmatterEnd = index;
        break;
      }
    }
  }

  let offset = 0;
  let byteOffset = 0;
  let fence: { marker: string; length: number } | undefined;
  let htmlClose: RegExp | "blank" | undefined;
  let footnote = false;
  let footnoteBlank = false;
  let paragraph: Paragraph | undefined;

  const addHeading = (
    level: HeadingLevel,
    rawText: string,
    line: number,
    headingOffset: number,
    headingByteOffset: number,
  ) => {
    const plain = headingText(rawText);
    while (levelStack.length) {
      const last = headings[levelStack[levelStack.length - 1]!]!;
      if (last.level < level) break;
      levelStack.pop();
    }
    const heading: DocumentHeading = {
      id: registry.id(plain),
      level,
      text: plain,
      line,
      offset: headingOffset,
      byteOffset: headingByteOffset,
      index: headings.length,
      parent: levelStack.length ? levelStack[levelStack.length - 1] : undefined,
    };
    headings.push(heading);
    levelStack.push(heading.index);
  };

  for (let index = 0; index < rawLines.length; index += 1) {
    const raw = rawLines[index]!;
    const line = stripReturn(raw);
    const lineNumber = index + 1;
    lineOffsets[index] = offset;
    const lineOffset = offset;
    const lineByteOffset = byteOffset;
    offset += raw.length + 1;
    byteOffset += utf8Length(raw) + 1;

    if (index <= frontmatterEnd) {
      if (index === frontmatterEnd) {
        frontmatter = {
          startLine: 1,
          endLine: lineNumber,
          start: 0,
          end: Math.min(offset, text.length),
          text: rawLines.slice(1, frontmatterEnd).map(stripReturn).join("\n"),
        };
      }
      continue;
    }

    const blank = line.trim() === "";

    if (fence) {
      const close = FENCE_CLOSE.exec(line);
      if (
        close &&
        close[1]![0] === fence.marker &&
        close[1]!.length >= fence.length
      ) {
        fence = undefined;
      }
      paragraph = undefined;
      continue;
    }

    if (htmlClose) {
      if (htmlClose === "blank" ? blank : htmlClose.test(line)) {
        htmlClose = undefined;
      }
      paragraph = undefined;
      continue;
    }

    if (footnote) {
      if (blank) {
        footnoteBlank = true;
        paragraph = undefined;
        continue;
      }
      if (INDENTED.test(line)) {
        if (footnoteBlank) definitions.push("");
        footnoteBlank = false;
        definitions.push(line);
        continue;
      }
      footnote = false;
      footnoteBlank = false;
    }

    if (blank) {
      paragraph = undefined;
      continue;
    }

    if (INDENTED.test(line)) {
      // Indented code, or a lazy paragraph continuation; neither is a heading.
      if (paragraph) paragraph.lines.push(line.trim());
      continue;
    }

    const open = FENCE_OPEN.exec(line);
    if (open && !(open[1]![0] === "`" && open[2]!.includes("`"))) {
      fence = { marker: open[1]![0]!, length: open[1]!.length };
      paragraph = undefined;
      continue;
    }

    const html = htmlBlockEnd(line, !paragraph);
    if (html) {
      htmlClose = html === "same-line" ? undefined : html;
      paragraph = undefined;
      continue;
    }

    const atx = ATX_HEADING.exec(line);
    if (atx) {
      const content = (atx[2] ?? "").replace(ATX_CLOSING, "").trim();
      addHeading(
        atx[1]!.length as HeadingLevel,
        content,
        lineNumber,
        lineOffset,
        lineByteOffset,
      );
      paragraph = undefined;
      continue;
    }

    const underline = SETEXT_UNDERLINE.exec(line);
    if (underline && paragraph) {
      addHeading(
        underline[1]![0] === "=" ? 1 : 2,
        paragraph.lines.join(" "),
        paragraph.startLine,
        paragraph.offset,
        paragraph.byteOffset,
      );
      paragraph = undefined;
      continue;
    }

    if (THEMATIC_BREAK.test(line)) {
      paragraph = undefined;
      continue;
    }

    if (FOOTNOTE_DEFINITION.test(line) && !paragraph) {
      definitions.push(line);
      footnote = true;
      footnoteBlank = false;
      continue;
    }

    if (LINK_DEFINITION.test(line) && !paragraph) {
      definitions.push(line);
      continue;
    }

    if (LIST_ITEM.test(line) || BLOCKQUOTE.test(line) || line.includes("|")) {
      // Container blocks and table rows never become setext headings.
      paragraph = undefined;
      continue;
    }

    if (paragraph) {
      paragraph.lines.push(line.trim());
    } else {
      paragraph = {
        startLine: lineNumber,
        offset: lineOffset,
        byteOffset: lineByteOffset,
        lines: [line.trim()],
      };
    }
  }

  const body = frontmatter
    ? { startLine: frontmatter.endLine + 1, start: frontmatter.end }
    : { startLine: 1, start: 0 };
  const lines = rawLines.length;
  const sections = buildSections(text, headings, body, lines);

  return {
    title:
      frontmatterTitle(frontmatter) ??
      headings.find((heading) => heading.level === 1)?.text,
    headings,
    sections,
    frontmatter,
    body,
    definitions,
    lines,
    bytes: byteOffset - (text.endsWith("\n") || rawLines.length === 0 ? 0 : 1),
    chars: text.length,
    lineOffsets,
  };
}

function stripReturn(line: string): string {
  return line.endsWith("\r") ? line.slice(0, -1) : line;
}

/**
 * Start of an HTML block. Returns the closing test, `"blank"` for blocks that
 * end at a blank line, or `"same-line"` when the block closes on its first
 * line.
 */
function htmlBlockEnd(
  line: string,
  canInterrupt: boolean,
): RegExp | "blank" | "same-line" | undefined {
  for (const [start, end] of HTML_BLOCK_STARTS) {
    if (!start.test(line)) continue;
    const rest = line.slice(line.indexOf("<") + 1);
    return end.test(rest) ? "same-line" : end;
  }
  if (HTML_BLOCK_6.test(line)) return "blank";
  if (canInterrupt && HTML_BLOCK_7.test(line)) return "blank";
  return undefined;
}

function frontmatterTitle(
  frontmatter: DocumentFrontmatter | undefined,
): string | undefined {
  const match = frontmatter
    ? /^title:[ \t]*(.+?)[ \t]*$/m.exec(frontmatter.text)
    : null;
  if (!match) return undefined;
  const value = match[1]!.replace(/^(["'])(.*)\1$/, "$2").trim();
  return value || undefined;
}

function buildSections(
  text: string,
  headings: DocumentHeading[],
  body: { startLine: number; start: number },
  lines: number,
): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const push = (
    level: number,
    heading: DocumentHeading | undefined,
    startLine: number,
    start: number,
    endLine: number,
    end: number,
  ) => {
    if (end <= start) return;
    sections.push({
      index: sections.length,
      level,
      heading,
      startLine,
      endLine,
      start,
      end,
      bytes: utf8Length(text.slice(start, end)),
    });
  };

  const first = headings[0];
  if (!first) {
    push(0, undefined, body.startLine, body.start, lines, text.length);
    return sections;
  }
  if (first.offset > body.start) {
    push(
      0,
      undefined,
      body.startLine,
      body.start,
      first.line - 1,
      first.offset,
    );
  }
  headings.forEach((heading, index) => {
    const next = headings[index + 1];
    push(
      heading.level,
      heading,
      heading.line,
      heading.offset,
      next ? next.line - 1 : lines,
      next ? next.offset : text.length,
    );
  });
  return sections;
}

/** Section that contains a 1-based source line. */
export function sectionAtLine(
  index: DocumentIndex,
  line: number,
): DocumentSection | undefined {
  const { sections } = index;
  let low = 0;
  let high = sections.length - 1;
  let found: DocumentSection | undefined;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const section = sections[middle]!;
    if (section.startLine <= line) {
      found = section;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

/** Nearest heading at or before a 1-based source line. */
export function headingAtLine(
  index: DocumentIndex,
  line: number,
): DocumentHeading | undefined {
  let found: DocumentHeading | undefined;
  for (const heading of index.headings) {
    if (heading.line > line) break;
    found = heading;
  }
  return found;
}

export function headingById(
  index: DocumentIndex,
  id: string,
): DocumentHeading | undefined {
  return index.headings.find((heading) => heading.id === id);
}

/** Source text of an inclusive 1-based line range. */
export function sliceLines(
  text: string,
  index: DocumentIndex,
  startLine: number,
  endLine: number,
): string {
  const start = index.lineOffsets[Math.max(1, startLine) - 1] ?? text.length;
  const end =
    endLine >= index.lines
      ? text.length
      : (index.lineOffsets[endLine] ?? text.length);
  return text.slice(start, end);
}

/** Nested outline built from the flat heading list. */
export function outlineTree(headings: DocumentHeading[]): OutlineNode[] {
  const roots: OutlineNode[] = [];
  const nodes: OutlineNode[] = headings.map((heading) => ({
    heading,
    children: [],
  }));
  nodes.forEach((node) => {
    const parent = node.heading.parent;
    if (parent === undefined) roots.push(node);
    else nodes[parent]!.children.push(node);
  });
  return roots;
}

/** 53-bit string hash (cyrb53), used for cache keys. */
export function documentHash(text: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    (h2 >>> 0).toString(16).padStart(8, "0") +
    (h1 >>> 0).toString(16).padStart(8, "0")
  );
}

export type DocumentIndexCache = BoundedCache<string, DocumentIndex>;

/**
 * Default index cache: the most recent documents by source size, so switching
 * between large documents does not re-scan them. The key is the content
 * hash, so edited content never hits a stale entry.
 */
export const documentIndexCache: DocumentIndexCache = new BoundedCache({
  maxEntries: 16,
  maxBytes: 32 * 1024 * 1024,
  size: (index) => index.chars,
});

export type CachedIndexOptions = {
  cache?: DocumentIndexCache;
  /** Host-provided identity, for example a path and version; skips hashing. */
  key?: string;
};

export function cachedDocumentIndex(
  text: string,
  options: CachedIndexOptions = {},
): DocumentIndex {
  const cache = options.cache ?? documentIndexCache;
  const key = `${options.key ?? documentHash(text)}:${text.length}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const index = indexDocument(text);
  cache.set(key, index);
  return index;
}

/** Character offset of each line start and the line count, without indexing. */
export function lineOffsetsOf(text: string): {
  offsets: number[];
  lines: number;
} {
  const offsets: number[] = [];
  if (text === "") return { offsets, lines: 0 };
  let offset = 0;
  while (offset <= text.length) {
    offsets.push(offset);
    const next = text.indexOf("\n", offset);
    if (next === -1) break;
    offset = next + 1;
  }
  if (text.endsWith("\n")) offsets.pop();
  return { offsets, lines: offsets.length };
}
