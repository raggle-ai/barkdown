import {
  ChevronDown,
  ChevronUp,
  ChevronsDownUp,
  ChevronsUpDown,
  Code,
  List,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type DocumentHeading,
  type DocumentIndex,
  cachedDocumentIndex,
} from "./document-index.js";
import {
  type BarkdownLoadState,
  formatElapsed,
  isLoading,
  loadPhaseLabels,
} from "./document-load.js";
import {
  renderMode,
  resolveLargeDocumentPolicy,
} from "./large-document-policy.js";
import { type BarkdownMarkdownProps, BarkdownMarkdown } from "./react.js";
import {
  type CollapseAllState,
  CollapseAllContext,
} from "./react-collapsible-sections.js";
import { BarkdownOutline } from "./react-outline.js";
import { BarkdownPlainText } from "./react-plain-text.js";
import type { BarkdownRenderProgress } from "./react-progressive.js";
import { useReadingPosition } from "./use-reading-position.js";

export type BarkdownReaderView = "rendered" | "source";

export type BarkdownReaderProps = Omit<
  BarkdownMarkdownProps,
  "value" | "index" | "firstLine"
> & {
  /** Full document source; frontmatter is indexed but not rendered. */
  value: string;
  /** Precomputed index of `value`; computed and cached when omitted. */
  index?: DocumentIndex;
  /** Cache identity for the index, such as the path and a version. */
  cacheKey?: string;
  /** Offer the outline panel. Default on. */
  outline?: boolean;
  /** Start with the outline open. Default: open on viewports of 1024px and wider. */
  defaultOutlineOpen?: boolean;
  /** Show the reading controls toolbar. Default on. */
  controls?: boolean;
  /** Controlled view; `defaultView` sets the uncontrolled start. */
  view?: BarkdownReaderView;
  defaultView?: BarkdownReaderView;
  onViewChange?: (view: BarkdownReaderView) => void;
  /** Host load state (listing, reading) shown in the status strip. */
  loading?: BarkdownLoadState;
  /** Scrolling element for reading position. Default: nearest scrollable ancestor or window. */
  scrollContainer?: HTMLElement | Window | null;
  /** Distance below the viewport top that counts as the reading line, in px. */
  readingOffset?: number;
  /** Rendered above the document, for example a metadata panel. */
  frontmatter?: ReactNode;
};

/**
 * Reading surface for long documents: a toolbar with position, previous and
 * next heading, collapse/expand, and view switch; an outline with heading
 * search; load and render progress; and deep links through the fragment.
 * Composes `BarkdownMarkdown` (progressive for large documents) and
 * `BarkdownPlainText`.
 */
export function BarkdownReader({
  cacheKey,
  className,
  collapsibleHeadings = false,
  controls = true,
  defaultOutlineOpen,
  defaultView,
  frontmatter,
  index,
  largeDocument,
  loading,
  onRenderProgress,
  onViewChange,
  outline = true,
  readingOffset,
  scrollContainer,
  style,
  value,
  view: controlledView,
  ...markdownProps
}: BarkdownReaderProps) {
  const documentIndex = useMemo(
    () =>
      index ?? cachedDocumentIndex(value, cacheKey ? { key: cacheKey } : {}),
    [cacheKey, index, value],
  );
  const body = useMemo(
    () => value.slice(documentIndex.body.start),
    [documentIndex, value],
  );
  const firstLine = documentIndex.body.startLine;
  const headings = documentIndex.headings;
  const mode =
    largeDocument === false
      ? "standard"
      : renderMode(
          { bytes: documentIndex.bytes, lines: documentIndex.lines },
          resolveLargeDocumentPolicy(largeDocument),
        );
  const renderedPolicy = useMemo(
    () =>
      largeDocument === false
        ? false
        : { ...largeDocument, plainTextBytes: Number.POSITIVE_INFINITY },
    // Serialized identity: the policy is plain data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(largeDocument ?? null)],
  );

  const [viewFor, setViewFor] = useState<{
    index: DocumentIndex;
    view: BarkdownReaderView;
  }>();
  const view: BarkdownReaderView =
    controlledView ??
    (viewFor?.index === documentIndex
      ? viewFor.view
      : (defaultView ?? (mode === "plain-text" ? "source" : "rendered")));
  const setView = (next: BarkdownReaderView) => {
    setViewFor({ index: documentIndex, view: next });
    onViewChange?.(next);
  };

  const [outlineOpen, setOutlineOpen] = useState(
    () =>
      defaultOutlineOpen ??
      (typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(min-width: 1024px)").matches),
  );
  const [collapse, setCollapse] = useState<CollapseAllState>({
    generation: 0,
    collapsed: false,
  });
  const [render, setRender] = useState<{
    index: DocumentIndex;
    progress: BarkdownRenderProgress;
    startedAt: number;
  }>();
  const [, setTick] = useState(0);

  const contentRef = useRef<HTMLDivElement>(null);
  const position = useReadingPosition(contentRef, headings, {
    offset: readingOffset,
    scrollContainer,
  });
  const outlineId = useId();

  const handleRenderProgress = useCallback(
    (progress: BarkdownRenderProgress) => {
      setRender((previous) => ({
        index: documentIndex,
        progress,
        startedAt:
          previous?.index === documentIndex ? previous.startedAt : Date.now(),
      }));
      onRenderProgress?.(progress);
    },
    [documentIndex, onRenderProgress],
  );

  const hostLoading = loading && isLoading(loading) ? loading : undefined;
  const rendering =
    render?.index === documentIndex && !render.progress.done
      ? render
      : undefined;
  const status = hostLoading
    ? {
        label: loadPhaseLabels[hostLoading.phase],
        detail: hostLoading.detail,
        progress: hostLoading.progress,
        elapsedMs: hostLoading.elapsedMs,
      }
    : rendering
      ? {
          label: loadPhaseLabels.rendering,
          detail: `${rendering.progress.rendered} / ${rendering.progress.total} sections`,
          progress: rendering.progress.rendered / rendering.progress.total,
          elapsedMs: Date.now() - rendering.startedAt,
        }
      : undefined;
  useEffect(() => {
    if (!status) return;
    const timer = window.setInterval(() => setTick((tick) => tick + 1), 250);
    return () => window.clearInterval(timer);
  }, [status !== undefined]);

  const target = useCallback(
    (heading: DocumentHeading) =>
      view === "source" ? `#L${heading.line}` : `#${heading.id}`,
    [view],
  );
  const go = useCallback(
    (headingIndex: number) => {
      const heading = headings[headingIndex];
      if (!heading || typeof window === "undefined") return;
      // `replace` keeps stepping through headings out of the history stack
      // and still fires `hashchange`, which reveals and focuses the heading.
      window.location.replace(target(heading));
    },
    [headings, target],
  );
  const nextIndex = position.activeIndex + 1;
  const previousIndex = position.activeIndex - 1;
  const canNext = nextIndex < headings.length;
  const canPrevious = previousIndex >= 0;

  useEffect(() => {
    if (!controls) return;
    const onKey = (event: KeyboardEvent) => {
      if (!event.altKey || event.defaultPrevented) return;
      if (event.key === "ArrowDown" && canNext) {
        event.preventDefault();
        go(nextIndex);
      } else if (event.key === "ArrowUp" && canPrevious) {
        event.preventDefault();
        go(previousIndex);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canNext, canPrevious, controls, go, nextIndex, previousIndex]);

  const active =
    position.activeIndex >= 0 ? headings[position.activeIndex] : undefined;
  const percent = Math.round(position.progress * 100);
  const showOutline = outline && headings.length > 0;

  return (
    <div
      className={["barkdown-reader", className].filter(Boolean).join(" ")}
      data-barkdown-reader=""
      data-barkdown-reader-view={view}
      data-barkdown-reader-outline={
        showOutline && outlineOpen ? "open" : "closed"
      }
      style={style}
    >
      {controls ? (
        <div
          aria-label="Reading controls"
          data-barkdown-reader-toolbar=""
          role="toolbar"
        >
          {showOutline ? (
            <button
              type="button"
              aria-controls={outlineId}
              aria-expanded={outlineOpen}
              aria-label={outlineOpen ? "Hide outline" : "Show outline"}
              title={outlineOpen ? "Hide outline" : "Show outline"}
              onClick={() => setOutlineOpen((open) => !open)}
            >
              <List aria-hidden="true" size={16} />
            </button>
          ) : null}
          <span data-barkdown-reader-position="" title={active?.text}>
            <span data-barkdown-reader-heading="">
              {active?.text ?? documentIndex.title ?? ""}
            </span>
            <span
              aria-label={`${percent}% read`}
              data-barkdown-reader-percent=""
            >
              {percent}%
            </span>
          </span>
          <span data-barkdown-reader-actions="">
            <button
              type="button"
              aria-keyshortcuts="Alt+ArrowUp"
              aria-label="Previous heading"
              title="Previous heading (Alt+↑)"
              disabled={!canPrevious}
              onClick={() => go(previousIndex)}
            >
              <ChevronUp aria-hidden="true" size={16} />
            </button>
            <button
              type="button"
              aria-keyshortcuts="Alt+ArrowDown"
              aria-label="Next heading"
              title="Next heading (Alt+↓)"
              disabled={!canNext}
              onClick={() => go(nextIndex)}
            >
              <ChevronDown aria-hidden="true" size={16} />
            </button>
            {collapsibleHeadings && view === "rendered" ? (
              <>
                <button
                  type="button"
                  aria-label="Collapse all sections"
                  title="Collapse all sections"
                  onClick={() =>
                    setCollapse((state) => ({
                      generation: state.generation + 1,
                      collapsed: true,
                    }))
                  }
                >
                  <ChevronsDownUp aria-hidden="true" size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Expand all sections"
                  title="Expand all sections"
                  onClick={() =>
                    setCollapse((state) => ({
                      generation: state.generation + 1,
                      collapsed: false,
                    }))
                  }
                >
                  <ChevronsUpDown aria-hidden="true" size={16} />
                </button>
              </>
            ) : null}
            <button
              type="button"
              aria-label="View source"
              aria-pressed={view === "source"}
              title={
                view === "source" ? "Show rendered document" : "Show source"
              }
              onClick={() => setView(view === "source" ? "rendered" : "source")}
            >
              <Code aria-hidden="true" size={16} />
            </button>
          </span>
        </div>
      ) : null}
      {status ? (
        <div data-barkdown-reader-status="">
          <progress
            aria-label="Loading document"
            max={1}
            value={status.progress}
          />
          <span role="status">{status.label}</span>
          <span aria-hidden="true">
            {status.detail ? ` · ${status.detail}` : ""}
            {` · ${formatElapsed(status.elapsedMs)}`}
          </span>
        </div>
      ) : null}
      <div data-barkdown-reader-body="">
        {showOutline && outlineOpen ? (
          <aside data-barkdown-reader-outline-panel="" id={outlineId}>
            <BarkdownOutline
              activeId={active?.id}
              headings={headings}
              href={target}
              onNavigate={() => {
                if (
                  typeof window !== "undefined" &&
                  window.matchMedia?.("(max-width: 900px)").matches
                ) {
                  setOutlineOpen(false);
                }
              }}
            />
          </aside>
        ) : null}
        <div data-barkdown-reader-content="" ref={contentRef}>
          {frontmatter}
          {view === "source" ? (
            <BarkdownPlainText firstLine={firstLine} value={body} />
          ) : (
            <CollapseAllContext.Provider value={collapse}>
              <BarkdownMarkdown
                {...markdownProps}
                collapsibleHeadings={collapsibleHeadings}
                firstLine={firstLine}
                index={documentIndex}
                largeDocument={renderedPolicy}
                onRenderProgress={handleRenderProgress}
                value={body}
              />
            </CollapseAllContext.Provider>
          )}
        </div>
      </div>
    </div>
  );
}
