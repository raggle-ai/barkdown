/**
 * One policy object decides how a document is rendered from its size. Small
 * documents keep the single-pass renderer. Documents at or above the `bytes`
 * or `lines` threshold render progressively by section with lazy syntax
 * highlighting. Documents at or above `plainTextBytes` open in the plain-text
 * source view, which the reader can switch away from.
 */

export type BarkdownLargeDocumentPolicy = {
  /** Source size in UTF-8 bytes from which a document counts as large. */
  bytes: number;
  /** Line count from which a document counts as large. */
  lines: number;
  /** Source size from which the plain-text view is the default. */
  plainTextBytes: number;
  /**
   * Target source bytes per progressive chunk. Consecutive sections are
   * merged until a chunk reaches this size; a single long section is never
   * split.
   */
  chunkBytes: number;
  /** Chunks rendered in the first paint before the scheduler takes over. */
  initialChunks: number;
  /** Main-thread time budget per progressive slice, in milliseconds. */
  sliceMs: number;
  /**
   * Highlight code blocks when they scroll near the viewport instead of in
   * the Markdown pipeline. Applies to progressive rendering only.
   */
  lazyHighlight: boolean;
};

export const defaultLargeDocumentPolicy: BarkdownLargeDocumentPolicy = {
  bytes: 120_000,
  lines: 2_500,
  plainTextBytes: 4_000_000,
  chunkBytes: 16_000,
  initialChunks: 2,
  sliceMs: 16,
  lazyHighlight: true,
};

export type BarkdownRenderMode = "standard" | "progressive" | "plain-text";

export type DocumentSize = { bytes: number; lines: number };

/** Policy input accepted by components: overrides, or `false` to disable. */
export type BarkdownLargeDocumentInput =
  Partial<BarkdownLargeDocumentPolicy> | false | undefined;

export function resolveLargeDocumentPolicy(
  input?: Partial<BarkdownLargeDocumentPolicy>,
): BarkdownLargeDocumentPolicy {
  const policy = { ...defaultLargeDocumentPolicy, ...input };
  for (const key of [
    "bytes",
    "lines",
    "plainTextBytes",
    "chunkBytes",
    "initialChunks",
    "sliceMs",
  ] as const) {
    if (!(policy[key] >= 0)) {
      throw new RangeError(`largeDocument.${key} must be a number >= 0`);
    }
  }
  return policy;
}

export function isLargeDocument(
  size: DocumentSize,
  policy: BarkdownLargeDocumentPolicy,
): boolean {
  return size.bytes >= policy.bytes || size.lines >= policy.lines;
}

/** Render mode for a document size under a policy; `false` disables. */
export function renderMode(
  size: DocumentSize,
  input: BarkdownLargeDocumentInput,
): BarkdownRenderMode {
  if (input === false) return "standard";
  const policy = resolveLargeDocumentPolicy(input);
  if (size.bytes >= policy.plainTextBytes) return "plain-text";
  return isLargeDocument(size, policy) ? "progressive" : "standard";
}
