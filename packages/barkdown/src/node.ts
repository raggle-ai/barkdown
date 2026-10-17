import { readdir, readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

import { indexDocument, lineOffsetsOf, utf8Length } from "./document-index.js";
import {
  type BarkdownDataset,
  type BarkdownDocument,
  type BarkdownPartial,
  type BarkdownRange,
  type BarkdownRangeResult,
  documentKind,
} from "./documents.js";

export type BarkdownFile = BarkdownDocument;
export type BarkdownFolder = BarkdownDataset;

export type ReadFolderOptions = {
  /**
   * Markdown and text files above this many UTF-8 bytes are listed with only
   * their first lines and a `partial` record of the full size. Hosts complete
   * them with `readRange`. Default: every file is read in full.
   */
  headBytes?: number;
};

const skipped = new Set([".git", ".turbo", "dist", "node_modules"]);

export async function readFolder(
  root: string,
  options: ReadFolderOptions = {},
): Promise<BarkdownFolder> {
  const folder = resolve(root);

  async function read(directory: string): Promise<BarkdownFile[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const found = await Promise.all(
      entries
        .filter((entry) => !skipped.has(entry.name))
        .map(async (entry): Promise<BarkdownFile[]> => {
          const path = resolve(directory, entry.name);
          if (entry.isDirectory()) return read(path);
          if (!entry.isFile()) return [];
          const kind = documentKind(entry.name);
          if (!kind) return [];
          const content = await readFile(path, "utf8");
          const document: BarkdownFile = {
            path: relative(folder, path).split(sep).join("/"),
            content,
            kind,
          };
          if (
            options.headBytes !== undefined &&
            kind !== "html" &&
            utf8Length(content) > options.headBytes
          ) {
            const head = documentHead(content, options.headBytes);
            document.content = head.content;
            document.partial = head.partial;
          }
          return [document];
        }),
    );
    return found.flat();
  }

  return {
    root: folder,
    documents: (await read(folder)).sort((left, right) =>
      left.path.localeCompare(right.path),
    ),
  };
}

/**
 * First lines of a document within a byte budget. The cut falls on a line
 * boundary, and on a structural heading when one sits in the second half of
 * the budget, so the head renders as complete sections and the remainder
 * starts at a heading.
 */
export function documentHead(
  content: string,
  headBytes: number,
): { content: string; partial: BarkdownPartial } {
  const index = indexDocument(content);
  let cut = 0;
  let bytes = 0;
  for (let line = 0; line < index.lineOffsets.length; line += 1) {
    const start = index.lineOffsets[line]!;
    const end = index.lineOffsets[line + 1] ?? content.length;
    const lineBytes = utf8Length(content.slice(start, end));
    if (bytes + lineBytes > headBytes) break;
    bytes += lineBytes;
    cut = end;
  }
  const heading = [...index.headings]
    .reverse()
    .find(
      (candidate) =>
        candidate.offset <= cut &&
        candidate.offset > index.body.start &&
        candidate.byteOffset >= headBytes / 2,
    );
  if (heading) cut = heading.offset;
  return {
    content: content.slice(0, cut),
    partial: { lines: index.lines, bytes: index.bytes },
  };
}

/** Lines `startLine` to `endLine` (1-based, inclusive) of one document. */
export async function readRange(
  root: string,
  path: string,
  range: BarkdownRange,
): Promise<BarkdownRangeResult> {
  const folder = resolve(root);
  const file = resolve(folder, path);
  if (file !== folder && !file.startsWith(`${folder}${sep}`)) {
    throw new Error(`${path} is outside ${folder}`);
  }
  const content = await readFile(file, "utf8");
  const { offsets, lines } = lineOffsetsOf(content);
  const startLine = Math.max(1, Math.floor(range.startLine));
  const endLine = Math.min(lines, Math.floor(range.endLine));
  if (startLine > lines || endLine < startLine) {
    return {
      content: "",
      startLine,
      endLine: startLine - 1,
      totalLines: lines,
    };
  }
  const start = offsets[startLine - 1] ?? content.length;
  const end =
    endLine >= lines ? content.length : (offsets[endLine] ?? content.length);
  return {
    content: content.slice(start, end),
    startLine,
    endLine,
    totalLines: lines,
  };
}
