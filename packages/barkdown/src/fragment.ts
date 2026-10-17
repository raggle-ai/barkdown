/**
 * Deep links: `#<heading-id>` targets a heading from the document index and
 * `#L<line>` targets a 1-based source line. Both resolve to a source line so
 * progressive rendering can bring the right chunk forward before scrolling.
 */
import {
  type DocumentHeading,
  type DocumentIndex,
  headingAtLine,
  headingById,
} from "./document-index.js";

export type FragmentTarget = {
  /** 1-based source line to reveal. */
  line: number;
  /** Heading to focus, when the fragment names or precedes one. */
  heading?: DocumentHeading;
  /** Element ID to scroll to when it exists in the rendered output. */
  id?: string;
};

export function parseFragment(hash: string): string | undefined {
  const value = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function fragmentTarget(
  index: DocumentIndex,
  hash: string,
): FragmentTarget | undefined {
  const fragment = parseFragment(hash);
  if (!fragment) return undefined;
  const lineMatch = /^L(\d+)$/.exec(fragment);
  if (lineMatch) {
    const line = Number(lineMatch[1]);
    if (line < 1 || line > Math.max(index.lines, 1)) return undefined;
    return { line, heading: headingAtLine(index, line), id: `L${line}` };
  }
  const heading = headingById(index, fragment);
  if (heading) return { line: heading.line, heading, id: heading.id };
  return undefined;
}

/**
 * Element for a target inside a rendered container: the element with the
 * fragment ID, else the nearest preceding element stamped with a source
 * line.
 */
export function fragmentElement(
  container: ParentNode,
  target: FragmentTarget,
): HTMLElement | undefined {
  if (target.id) {
    const owner =
      "getElementById" in container
        ? (container as Document)
        : (container as Element).ownerDocument;
    const exact = owner.getElementById(target.id);
    if (exact && container.contains(exact)) return exact;
  }
  let best: HTMLElement | undefined;
  let bestLine = 0;
  for (const element of container.querySelectorAll<HTMLElement>(
    "[data-barkdown-line]",
  )) {
    const line = Number(element.dataset["barkdownLine"]);
    if (line <= target.line && line >= bestLine) {
      best = element;
      bestLine = line;
    }
  }
  return best;
}

/** Runs after the next paint, or on the next tick without a renderer. */
export function nextFrame(callback: () => void): void {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => callback());
  } else {
    setTimeout(callback, 0);
  }
}

/** Scroll an element into view and move focus to it without a second jump. */
export function revealElement(element: HTMLElement): void {
  element.scrollIntoView?.({ block: "start" });
  if (element.tabIndex < 0 && !element.hasAttribute("tabindex")) {
    element.setAttribute("tabindex", "-1");
  }
  element.focus({ preventScroll: true });
}
