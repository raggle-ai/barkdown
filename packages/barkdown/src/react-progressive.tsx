import {
  createElement,
  memo,
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import type { DocumentHeading, DocumentIndex } from "./document-index.js";
import {
  type FragmentTarget,
  fragmentElement,
  fragmentTarget,
  nextFrame,
  revealElement,
} from "./fragment.js";
import type { BarkdownLargeDocumentPolicy } from "./large-document-policy.js";

/** A run of consecutive sections rendered as one Markdown pass. */
export type DocumentChunk = {
  index: number;
  /** Offsets into the rendered value; `end` is exclusive. */
  start: number;
  end: number;
  /** Absolute 1-based source lines. */
  startLine: number;
  endLine: number;
  lines: number;
  bytes: number;
  headings: DocumentHeading[];
};

export type BarkdownRenderProgress = {
  /** Chunks rendered so far. */
  rendered: number;
  total: number;
  done: boolean;
};

export type ChunkOptions = {
  /** Offset of the rendered value inside the indexed document. */
  valueStart: number;
  chunkBytes: number;
  /**
   * Keep a heading's sub-sections in its chunk, so collapsible sections keep
   * their nesting. Chunks then close only at the document's main heading
   * level, or once they reach four times `chunkBytes`.
   */
  keepNesting: boolean;
};

/** Shallowest heading level that occurs more than once. */
export function splitLevel(index: DocumentIndex): number {
  const counts = new Map<number, number>();
  for (const heading of index.headings) {
    counts.set(heading.level, (counts.get(heading.level) ?? 0) + 1);
  }
  for (let level = 1; level <= 6; level += 1) {
    if ((counts.get(level) ?? 0) > 1) return level;
  }
  return 6;
}

export function chunkDocument(
  index: DocumentIndex,
  options: ChunkOptions,
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const level = options.keepNesting ? splitLevel(index) : 6;
  let current: DocumentChunk | undefined;

  const open = (
    start: number,
    end: number,
    startLine: number,
    endLine: number,
    bytes: number,
    heading?: DocumentHeading,
  ) => {
    current = {
      index: chunks.length,
      start,
      end,
      startLine,
      endLine,
      lines: endLine - startLine + 1,
      bytes,
      headings: heading ? [heading] : [],
    };
    chunks.push(current);
  };

  if (options.valueStart < index.body.start) {
    // Frontmatter or other text before the body stays in the first chunk.
    open(
      0,
      index.body.start - options.valueStart,
      lineAt(index, options.valueStart),
      index.body.startLine - 1,
      index.body.start - options.valueStart,
    );
  }

  for (const section of index.sections) {
    if (section.end <= options.valueStart) continue;
    const start =
      Math.max(section.start, options.valueStart) - options.valueStart;
    const end = section.end - options.valueStart;
    const startLine = Math.max(
      section.startLine,
      lineAt(index, options.valueStart),
    );
    const close =
      current &&
      current.bytes >= options.chunkBytes &&
      (!options.keepNesting ||
        section.level === 0 ||
        section.level <= level ||
        current.bytes >= options.chunkBytes * 4);
    if (!current || close) {
      open(
        start,
        end,
        startLine,
        section.endLine,
        section.bytes,
        section.heading,
      );
    } else {
      current.end = end;
      current.endLine = section.endLine;
      current.lines = current.endLine - current.startLine + 1;
      current.bytes += section.bytes;
      if (section.heading) current.headings.push(section.heading);
    }
  }
  return chunks;
}

function lineAt(index: DocumentIndex, offset: number): number {
  let low = 0;
  let high = index.lineOffsets.length - 1;
  let line = 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if ((index.lineOffsets[middle] ?? 0) <= offset) {
      line = middle + 1;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return line;
}

export function chunkForLine(
  chunks: DocumentChunk[],
  line: number,
): DocumentChunk | undefined {
  let found: DocumentChunk | undefined;
  for (const chunk of chunks) {
    if (chunk.startLine > line) break;
    found = chunk;
  }
  return found;
}

/**
 * Moves focus and scroll to the fragment in `window.location.hash` when the
 * component mounts and whenever the hash changes. `ensure` lets progressive
 * rendering bring the target's chunk forward first; it returns `true` when it
 * will call `reveal` itself once the chunk is rendered.
 */
export function useFragmentNavigation(
  containerRef: RefObject<HTMLElement | null>,
  index: DocumentIndex,
  ensure?: (target: FragmentTarget) => boolean,
) {
  const ensureRef = useRef(ensure);
  ensureRef.current = ensure;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const navigate = () => {
      const target = fragmentTarget(index, window.location.hash);
      if (!target) return;
      if (ensureRef.current?.(target)) return;
      const container = containerRef.current;
      const element = container && fragmentElement(container, target);
      if (element) nextFrame(() => revealElement(element));
    };
    navigate();
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, [containerRef, index]);
}

type ChunkRenderer = (text: string, chunk: DocumentChunk) => ReactNode;

const RenderedChunk = memo(function RenderedChunk({
  chunk,
  render,
  text,
}: {
  chunk: DocumentChunk;
  render: ChunkRenderer;
  text: string;
}) {
  return <>{render(text, chunk)}</>;
});

export type ProgressiveMarkdownProps = {
  value: string;
  index: DocumentIndex;
  /** 1-based source line of the first line of `value`. */
  firstLine: number;
  policy: BarkdownLargeDocumentPolicy;
  keepNesting: boolean;
  /** Text appended to every chunk: link and footnote definitions. */
  definitions: string;
  renderChunk: ChunkRenderer;
  containerRef: RefObject<HTMLDivElement | null>;
  onProgress?: (progress: BarkdownRenderProgress) => void;
  /** Estimated rendered height per source line, for placeholders. */
  lineHeightEm?: number;
};

type RenderedState = { chunks: DocumentChunk[]; rendered: ReadonlySet<number> };

function initialRendered(
  chunks: DocumentChunk[],
  count: number,
): RenderedState {
  const rendered = new Set<number>();
  for (let index = 0; index < Math.min(count, chunks.length); index += 1) {
    rendered.add(index);
  }
  return { chunks, rendered };
}

/**
 * Renders a large document chunk by chunk. The first chunks render in the
 * first paint; the rest render in idle slices, in order, except that chunks
 * scrolled near the viewport and deep-link targets jump the queue.
 * Unrendered chunks are placeholders that already carry their headings and
 * IDs, so the outline, fragment links, and find-in-page work before the text
 * is there. The slice size adapts to the measured commit time so the main
 * thread stays within `policy.sliceMs` per slice.
 */
export function ProgressiveMarkdown({
  containerRef,
  definitions,
  firstLine,
  index,
  keepNesting,
  lineHeightEm = 1.6,
  onProgress,
  policy,
  renderChunk,
  value,
}: ProgressiveMarkdownProps) {
  const valueStart = index.lineOffsets[firstLine - 1] ?? 0;
  const chunksRef = useRef<DocumentChunk[]>([]);
  const chunks = useChunks(index, valueStart, policy.chunkBytes, keepNesting);
  chunksRef.current = chunks;

  const [state, setState] = useState<RenderedState>(() =>
    initialRendered(chunks, policy.initialChunks),
  );
  const current =
    state.chunks === chunks
      ? state
      : initialRendered(chunks, policy.initialChunks);
  const renderedRef = useRef(current.rendered);
  renderedRef.current = current.rendered;
  useEffect(() => {
    if (state.chunks !== chunks)
      setState(initialRendered(chunks, policy.initialChunks));
  }, [chunks, policy.initialChunks, state.chunks]);

  const priorities = useRef(new Set<number>());
  const pending = useRef<{ handle: number; idle: boolean }>(undefined);
  /** Source bytes per slice; adapts to the measured commit time. */
  const budget = useRef(policy.chunkBytes);
  const sliceStart = useRef<number | undefined>(undefined);
  const target = useRef<FragmentTarget | undefined>(undefined);
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;

  const slice = useCallback(() => {
    const done = renderedRef.current;
    const all = chunksRef.current;
    const picks: number[] = [];
    let bytes = 0;
    const pick = (index: number) => {
      picks.push(index);
      bytes += all[index]?.bytes ?? 0;
    };
    for (const index of [...priorities.current].sort((a, b) => a - b)) {
      if (bytes >= budget.current) break;
      priorities.current.delete(index);
      if (!done.has(index) && index < all.length) pick(index);
    }
    for (
      let index = 0;
      index < all.length && bytes < budget.current;
      index += 1
    ) {
      if (!done.has(index) && !picks.includes(index)) pick(index);
    }
    if (!picks.length) return;
    sliceStart.current = performance.now();
    setState((previous) => ({
      chunks: all,
      rendered: new Set([
        ...(previous.chunks === all ? previous.rendered : []),
        ...picks,
      ]),
    }));
  }, []);

  const schedule = useCallback(
    (urgent: boolean) => {
      if (pending.current) {
        if (!urgent || !pending.current.idle) return;
        cancelIdle(pending.current.handle);
      }
      const run = () => {
        pending.current = undefined;
        slice();
      };
      if (!urgent && typeof requestIdleCallback === "function") {
        pending.current = {
          handle: requestIdleCallback(run, { timeout: 250 }),
          idle: true,
        };
      } else {
        pending.current = { handle: window.setTimeout(run, 0), idle: false };
      }
    },
    [slice],
  );

  useEffect(
    () => () => {
      if (!pending.current) return;
      if (pending.current.idle) cancelIdle(pending.current.handle);
      else window.clearTimeout(pending.current.handle);
      pending.current = undefined;
    },
    [],
  );

  const observer = useRef<IntersectionObserver | undefined>(undefined);
  const observe = useCallback(
    (element: HTMLElement | null) => {
      if (!element || typeof IntersectionObserver === "undefined") return;
      observer.current ??= new IntersectionObserver(
        (entries) => {
          let urgent = false;
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const index = Number(
              (entry.target as HTMLElement).dataset["barkdownChunk"],
            );
            if (!renderedRef.current.has(index)) {
              priorities.current.add(index);
              urgent = true;
            }
          }
          if (urgent) schedule(true);
        },
        { rootMargin: "100% 0px 200% 0px" },
      );
      observer.current.observe(element);
      return () => observer.current?.unobserve(element);
    },
    [schedule],
  );
  useEffect(() => () => observer.current?.disconnect(), []);

  const reveal = useCallback(
    (fragment: FragmentTarget) => {
      target.current = undefined;
      const container = containerRef.current;
      const element = container && fragmentElement(container, fragment);
      if (element) nextFrame(() => revealElement(element));
    },
    [containerRef],
  );

  useFragmentNavigation(containerRef, index, (fragment) => {
    const chunk = chunkForLine(chunksRef.current, fragment.line);
    if (!chunk || renderedRef.current.has(chunk.index)) return false;
    target.current = fragment;
    priorities.current.add(chunk.index);
    schedule(true);
    return true;
  });

  useLayoutEffect(() => {
    if (sliceStart.current !== undefined) {
      const took = performance.now() - sliceStart.current;
      sliceStart.current = undefined;
      if (took < policy.sliceMs / 2) {
        budget.current = Math.min(budget.current * 2, policy.chunkBytes * 8);
      } else if (took > policy.sliceMs * 1.5) {
        budget.current = Math.max(
          policy.chunkBytes,
          Math.floor(budget.current / 2),
        );
      }
    }
    const rendered = current.rendered.size;
    const total = chunks.length;
    if (target.current) {
      const chunk = chunkForLine(chunks, target.current.line);
      if (!chunk || current.rendered.has(chunk.index)) reveal(target.current);
    }
    progressRef.current?.({ rendered, total, done: rendered >= total });
    if (rendered < total) schedule(priorities.current.size > 0);
  }, [
    chunks,
    current.rendered,
    policy.chunkBytes,
    policy.sliceMs,
    reveal,
    schedule,
  ]);

  return (
    <>
      {chunks.map((chunk) => {
        const estimate = `${Math.max(2, Math.round(chunk.lines * lineHeightEm))}em`;
        if (current.rendered.has(chunk.index)) {
          return (
            <div
              key={chunk.index}
              data-barkdown-chunk={chunk.index}
              data-barkdown-chunk-start={chunk.startLine}
              style={
                { containIntrinsicSize: `auto ${estimate}` } as CSSProperties
              }
            >
              <RenderedChunk
                chunk={chunk}
                render={renderChunk}
                text={`${value.slice(chunk.start, chunk.end)}${definitions}`}
              />
            </div>
          );
        }
        return (
          <div
            key={chunk.index}
            ref={observe}
            aria-busy="true"
            data-barkdown-chunk={chunk.index}
            data-barkdown-chunk-pending=""
            data-barkdown-chunk-start={chunk.startLine}
            style={{ minHeight: estimate }}
          >
            {chunk.headings.map((heading) =>
              createElement(
                `h${heading.level}`,
                {
                  key: heading.id,
                  id: heading.id,
                  tabIndex: -1,
                  "data-barkdown-line": heading.line,
                  "data-barkdown-heading-pending": "",
                },
                heading.text,
              ),
            )}
            <p aria-hidden="true" data-barkdown-chunk-loading="">
              Loading…
            </p>
          </div>
        );
      })}
    </>
  );
}

function useChunks(
  index: DocumentIndex,
  valueStart: number,
  chunkBytes: number,
  keepNesting: boolean,
): DocumentChunk[] {
  const cache = useRef<{
    key: string;
    index: DocumentIndex;
    chunks: DocumentChunk[];
  }>(undefined);
  const key = `${valueStart}:${chunkBytes}:${keepNesting}`;
  if (
    !cache.current ||
    cache.current.index !== index ||
    cache.current.key !== key
  ) {
    cache.current = {
      key,
      index,
      chunks: chunkDocument(index, { valueStart, chunkBytes, keepNesting }),
    };
  }
  return cache.current.chunks;
}

function cancelIdle(handle: number) {
  if (typeof cancelIdleCallback === "function") cancelIdleCallback(handle);
}
