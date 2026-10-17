export type BarkdownKind = "markdown" | "html" | "text";

export const extensions = new Set([
  ".htm",
  ".html",
  ".markdown",
  ".md",
  ".text",
  ".txt",
]);

export function documentKind(path: string): BarkdownKind | undefined {
  const extension = path.slice(path.lastIndexOf(".")).toLowerCase();
  if (extension === ".htm" || extension === ".html") return "html";
  if (extension === ".md" || extension === ".markdown") return "markdown";
  if (extension === ".text" || extension === ".txt") return "text";
  return undefined;
}

export function documentMatches(
  document: { path: string; content: string },
  query: string,
) {
  const value = query.trim().toLowerCase();
  if (!value) return true;
  return `${document.path}\n${document.content}`.toLowerCase().includes(value);
}

export function documentPath(search: string) {
  return new URLSearchParams(search).get("file");
}

export function documentUrl(current: string, path: string) {
  const url = new URL(current);
  url.searchParams.set("file", path);
  url.searchParams.delete("document");
  // A new document starts at its top, not at the previous document's fragment.
  url.hash = "";
  return url;
}

/** Totals of a document whose `content` holds only its first lines. */
export type BarkdownPartial = {
  lines: number;
  bytes: number;
};

export type BarkdownDocument = {
  path: string;
  /** Full content, or the first lines when `partial` is set. */
  content: string;
  kind: BarkdownKind;
  partial?: BarkdownPartial;
};

export type BarkdownDataset = {
  root: string;
  documents: BarkdownDocument[];
};

export type BarkdownReadOptions = {
  /** Aborts the read; a source may ignore it. */
  signal?: AbortSignal;
};

/** Inclusive 1-based line range. */
export type BarkdownRange = {
  startLine: number;
  endLine: number;
};

export type BarkdownRangeResult = {
  content: string;
  startLine: number;
  /** Last line actually returned; below the request at the end of the file. */
  endLine: number;
  totalLines: number;
};

/**
 * Where documents come from. `read` lists the folder with content; it is the
 * whole contract for simple hosts. A source that serves long documents in
 * parts marks them `partial` in the dataset and implements `readRange`.
 */
export type BarkdownSource = {
  read(options?: BarkdownReadOptions): Promise<BarkdownDataset>;
  readRange?(
    path: string,
    range: BarkdownRange,
    options?: BarkdownReadOptions,
  ): Promise<BarkdownRangeResult>;
  openRoot?(): Promise<void>;
};
