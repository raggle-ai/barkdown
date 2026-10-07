import { ChevronDown } from "lucide-react";
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  HeadingCopyAnchor,
  headingReference,
  headingTitle as extractHeadingTitle,
} from "./react-heading-copy.js";
import { useCopyToClipboard } from "./use-copy-to-clipboard.js";

export type CollapsibleSectionProps = {
  children?: ReactNode;
  headingCopyPath?: string;
};

/**
 * Interactive section rendered for each `barkdown-section` tree group.
 * Sections are open by default so the feature never hides content. The real
 * `button` carries `aria-expanded` and `aria-controls`, which gives keyboard
 * operation and screen-reader state for free.
 */
export function CollapsibleSection({
  children,
  headingCopyPath,
}: CollapsibleSectionProps) {
  const { open, toggle, contentRef } = useSectionToggle();
  const { copied, copy } = useCopyToClipboard();

  const childArray = Children.toArray(children);
  const headingIndex = childArray.findIndex((child) => isValidElement(child));
  const heading = headingIndex >= 0 ? childArray[headingIndex] : null;
  const content = childArray.filter((_, index) => index !== headingIndex);
  const headingId =
    isValidElement<{ id?: string }>(heading) &&
    typeof heading.props.id === "string"
      ? heading.props.id
      : undefined;
  const contentId = headingId ? `${headingId}-content` : undefined;

  const headingLine =
    isValidElement<Record<string, unknown>>(heading) &&
    typeof heading.props["data-barkdown-line"] === "string"
      ? heading.props["data-barkdown-line"]
      : undefined;

  const title = isValidElement<{ children?: ReactNode }>(heading)
    ? extractHeadingTitle(heading.props.children)
    : undefined;
  const target =
    headingCopyPath && headingLine
      ? headingReference(headingCopyPath, headingLine, title)
      : undefined;

  const toggleHeading =
    isValidElement<{ children?: ReactNode }>(heading) && contentId
      ? cloneElement(
          heading,
          {},
          target ? (
            <HeadingCopyAnchor
              copied={copied}
              onCopy={() => copy(target)}
              target={target}
            />
          ) : null,
          <button
            type="button"
            className="barkdown-heading-toggle"
            aria-expanded={open}
            aria-controls={contentId}
            onClick={toggle}
          >
            <span className="barkdown-heading-toggle-label">
              {heading.props.children}
            </span>
            <ChevronDown
              aria-hidden="true"
              className="barkdown-heading-toggle-icon"
              size={18}
            />
          </button>,
        )
      : heading;

  return (
    <section data-barkdown-section="">
      {toggleHeading}
      <div
        ref={contentRef}
        id={contentId}
        className="barkdown-section-content"
        hidden={!open}
      >
        {content}
      </div>
    </section>
  );
}

/**
 * Open/closed state and the fragment-link open for one section. A fragment
 * link must open every closed ancestor section before the browser moves to
 * the target. Headings have stable IDs, so deep links keep working after a
 * reader collapses a section.
 */
export function useSectionToggle() {
  const [open, setOpen] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const openFragmentAncestors = () => {
      const hash = window.location.hash;
      if (hash.length < 2) return;
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target && contentRef.current?.contains(target)) {
        setOpen(true);
      }
    };

    openFragmentAncestors();
    window.addEventListener("hashchange", openFragmentAncestors);
    return () =>
      window.removeEventListener("hashchange", openFragmentAncestors);
  }, []);

  function toggle() {
    setOpen((current) => !current);
  }

  return { open, toggle, contentRef };
}
