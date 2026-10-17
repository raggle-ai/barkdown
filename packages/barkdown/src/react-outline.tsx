import { Search } from "lucide-react";
import {
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type DocumentHeading,
  type OutlineNode,
  outlineTree,
} from "./document-index.js";

export type BarkdownOutlineProps = {
  headings: DocumentHeading[];
  /** ID of the heading being read; its entry gets `aria-current="location"`. */
  activeId?: string;
  /** Deepest heading level listed. Default 6. */
  maxLevel?: number;
  /** Show the heading search field. Default on. */
  search?: boolean;
  /** Accessible name of the navigation landmark. */
  label?: string;
  className?: string;
  /** Link target for a heading. Default: the heading's fragment. */
  href?: (heading: DocumentHeading) => string;
  /** Called when the reader follows an entry. */
  onNavigate?: (heading: DocumentHeading) => void;
};

/**
 * Table of contents built from the document index. Entries are plain
 * fragment links, so they work with the browser's own navigation, keyboard
 * focus, and history. The active entry follows the reading position and is
 * kept scrolled into view inside the outline.
 */
export function BarkdownOutline({
  activeId,
  className,
  headings,
  href = (heading) => `#${heading.id}`,
  label = "Document outline",
  maxLevel = 6,
  onNavigate,
  search = true,
}: BarkdownOutlineProps) {
  const [query, setQuery] = useState("");
  const inputId = useId();
  const activeRef = useRef<HTMLAnchorElement>(null);
  const visible = useMemo(
    () => headings.filter((heading) => heading.level <= maxLevel),
    [headings, maxLevel],
  );
  const tree = useMemo(() => outlineTree(reparent(visible)), [visible]);
  const needle = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      needle
        ? visible.filter((heading) =>
            heading.text.toLowerCase().includes(needle),
          )
        : [],
    [needle, visible],
  );

  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [activeId]);

  const navigate = (heading: DocumentHeading) => {
    onNavigate?.(heading);
  };
  const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || !matches[0]) return;
    event.preventDefault();
    const target = matches[0];
    window.location.replace(href(target));
    navigate(target);
  };

  const renderLink = (heading: DocumentHeading) => {
    const active = heading.id === activeId;
    return (
      <a
        aria-current={active ? "location" : undefined}
        data-barkdown-outline-link=""
        data-level={heading.level}
        href={href(heading)}
        onClick={() => navigate(heading)}
        ref={active ? activeRef : undefined}
      >
        {heading.text || "Untitled section"}
      </a>
    );
  };
  const renderNodes = (nodes: OutlineNode[]) => (
    <ol>
      {nodes.map((node) => (
        <li key={node.heading.id}>
          {renderLink(node.heading)}
          {node.children.length ? renderNodes(node.children) : null}
        </li>
      ))}
    </ol>
  );

  return (
    <nav aria-label={label} className={className} data-barkdown-outline="">
      {search ? (
        <div data-barkdown-outline-search="">
          <Search aria-hidden="true" size={14} />
          <label className="barkdown-sr-only" htmlFor={inputId}>
            Search headings
          </label>
          <input
            id={inputId}
            type="search"
            placeholder="Search headings"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onSearchKey}
          />
        </div>
      ) : null}
      {needle ? (
        matches.length ? (
          <ol data-barkdown-outline-results="">
            {matches.map((heading) => (
              <li key={heading.id}>{renderLink(heading)}</li>
            ))}
          </ol>
        ) : (
          <p data-barkdown-outline-empty="">No headings match.</p>
        )
      ) : visible.length ? (
        renderNodes(tree)
      ) : (
        <p data-barkdown-outline-empty="">No headings.</p>
      )}
    </nav>
  );
}

/**
 * Recomputes parents for a filtered heading list so deeper headings whose
 * parent was filtered out attach to the nearest remaining ancestor.
 */
function reparent(headings: DocumentHeading[]): DocumentHeading[] {
  const stack: number[] = [];
  return headings.map((heading, index) => {
    while (
      stack.length &&
      headings[stack[stack.length - 1]!]!.level >= heading.level
    ) {
      stack.pop();
    }
    const parent = stack.length ? stack[stack.length - 1] : undefined;
    stack.push(index);
    return { ...heading, index, parent };
  });
}
