import { Hash, Check } from "lucide-react";
import { isValidElement, type ReactNode } from "react";

import { useCopyToClipboard } from "./use-copy-to-clipboard.js";

/**
 * Hashtag button shown on a heading's hover. Copies a VS Code-style
 * `path:line [title]` reference to the heading's Markdown source line.
 */
export function HeadingCopyAnchor({
  path,
  line,
  title,
}: {
  path: string;
  line: string;
  title?: string;
}) {
  const { copied, copy } = useCopyToClipboard();
  const target = `${path}:${line}${title ? ` [${title}]` : ""}`;

  return (
    <button
      type="button"
      className="barkdown-heading-copy"
      aria-label={`Copy heading reference ${target}`}
      title={`Copy ${target}`}
      onClick={(event) => {
        event.stopPropagation();
        copy(target);
      }}
    >
      {copied ? (
        <Check aria-hidden="true" size={14} />
      ) : (
        <Hash aria-hidden="true" size={14} />
      )}
    </button>
  );
}

/** Plain text of a heading's children, for the copyable reference. */
export function headingTitle(children: ReactNode): string | undefined {
  const parts: string[] = [];
  const visit = (node: ReactNode) => {
    if (typeof node === "string" || typeof node === "number") {
      parts.push(String(node));
    } else if (isValidElement<{ children?: ReactNode }>(node)) {
      if (node.props.children != null) visit(node.props.children);
    } else if (Array.isArray(node)) {
      for (const item of node) visit(item);
    }
  };
  visit(children);
  const joined = parts.join("").replace(/\s+/g, " ").trim();
  return joined || undefined;
}
