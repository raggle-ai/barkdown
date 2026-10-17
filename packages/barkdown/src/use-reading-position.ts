import { type RefObject, useEffect, useRef, useState } from "react";

import type { DocumentHeading } from "./document-index.js";

export type ReadingPosition = {
  /** Index into `headings` of the heading being read, or -1 before the first. */
  activeIndex: number;
  activeId?: string;
  /** Share of the document that has scrolled past the bottom of the viewport. */
  progress: number;
};

export type ReadingPositionOptions = {
  /** Scrolling element. Default: the nearest scrollable ancestor, else the window. */
  scrollContainer?: HTMLElement | Window | null;
  /** Distance below the viewport top that counts as the reading line, in px. */
  offset?: number;
};

const INITIAL: ReadingPosition = { activeIndex: -1, progress: 0 };

/** Nearest ancestor that scrolls vertically, or the window. */
export function findScrollContainer(
  element: HTMLElement,
): HTMLElement | Window {
  let node: HTMLElement | null = element.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return window;
}

/**
 * Index of the last heading at or above the reading line. Headings are in
 * document order, so the search is binary over their positions.
 */
export function activeHeadingIndex(
  tops: number[],
  readingLine: number,
): number {
  let low = 0;
  let high = tops.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if ((tops[middle] ?? Number.POSITIVE_INFINITY) <= readingLine) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

/**
 * Tracks which heading is being read and how far the reader has scrolled.
 * Measurements go through chunk containers first, so skipped (off-screen)
 * progressive chunks are not laid out just to find the active heading.
 */
export function useReadingPosition(
  containerRef: RefObject<HTMLElement | null>,
  headings: DocumentHeading[],
  options: ReadingPositionOptions = {},
): ReadingPosition {
  const [position, setPosition] = useState<ReadingPosition>(INITIAL);
  const { offset = 96, scrollContainer } = options;
  const headingsRef = useRef(headings);
  headingsRef.current = headings;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;
    const scroller = scrollContainer ?? findScrollContainer(container);
    let frame = 0;

    const measure = () => {
      frame = 0;
      const current = containerRef.current;
      if (!current) return;
      const windowScroller = isWindow(scroller);
      const viewportTop = windowScroller
        ? 0
        : scroller.getBoundingClientRect().top;
      const viewportHeight = windowScroller
        ? window.innerHeight
        : scroller.clientHeight;
      const readingLine = viewportTop + offset;
      const rect = current.getBoundingClientRect();
      const progress =
        rect.height > 0
          ? Math.min(
              1,
              Math.max(
                0,
                (viewportTop + viewportHeight - rect.top) / rect.height,
              ),
            )
          : 0;

      const list = headingsRef.current;
      let activeIndex = -1;
      const chunks = [
        ...current.querySelectorAll<HTMLElement>("[data-barkdown-chunk]"),
      ];
      if (chunks.length) {
        const tops = chunks.map((chunk) => chunk.getBoundingClientRect().top);
        const chunkIndex = activeHeadingIndex(tops, readingLine);
        if (chunkIndex >= 0) {
          const chunk = chunks[chunkIndex]!;
          const inside = [
            ...chunk.querySelectorAll<HTMLElement>("[data-barkdown-line]"),
          ].filter((element) => /^H[1-6]$/.test(element.tagName));
          const insideTops = inside.map(
            (element) => element.getBoundingClientRect().top,
          );
          const headingInChunk = activeHeadingIndex(insideTops, readingLine);
          const line =
            headingInChunk >= 0
              ? Number(inside[headingInChunk]!.dataset["barkdownLine"])
              : Number(chunk.dataset["barkdownChunkStart"]) - 1;
          activeIndex = lastHeadingAtOrBefore(list, line);
        }
      } else {
        const elements = list
          .map((heading) =>
            current.querySelector<HTMLElement>(`#${escape(heading.id)}`),
          )
          .filter((element): element is HTMLElement => Boolean(element));
        activeIndex = activeHeadingIndex(
          elements.map((element) => element.getBoundingClientRect().top),
          readingLine,
        );
      }

      const next: ReadingPosition = {
        activeIndex,
        activeId: activeIndex >= 0 ? list[activeIndex]?.id : undefined,
        progress: Math.round(progress * 200) / 200,
      };
      setPosition((previous) =>
        previous.activeIndex === next.activeIndex &&
        previous.activeId === next.activeId &&
        previous.progress === next.progress
          ? previous
          : next,
      );
    };
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    schedule();
    scroller.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(schedule)
        : undefined;
    observer?.observe(container);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
    };
  }, [containerRef, headings, offset, scrollContainer]);

  return position;
}

function isWindow(target: HTMLElement | Window): target is Window {
  return !("getBoundingClientRect" in target);
}

function lastHeadingAtOrBefore(
  headings: DocumentHeading[],
  line: number,
): number {
  let found = -1;
  for (const heading of headings) {
    if (heading.line > line) break;
    found = heading.index;
  }
  return found;
}

function escape(id: string): string {
  return typeof CSS !== "undefined" && typeof CSS.escape === "function"
    ? CSS.escape(id)
    : id.replace(/[^\p{L}\p{N}_-]/gu, (character) => `\\${character}`);
}
