import { Hash, Check } from "lucide-react";
import {
  type ComponentProps,
  type ComponentType,
  isValidElement,
  type ReactNode,
} from "react";

import { joinClassNames } from "../class-names.js";
import { useCopyToClipboard } from "../use-copy-to-clipboard.js";

/**
 * Hashtag button for a heading hover. Copy target is a VS Code-style
 * `path:line [title]` reference to the heading's Markdown source line.
 *
 * `inline` places the button right after the heading text; without it the
 * button sits in the right gutter (used inside collapsible section toggles).
 */
export function HeadingCopyAnchor({
  target,
  copied,
  onCopy,
  inline,
}: {
  target: string;
  copied: boolean;
  onCopy: () => void;
  inline?: boolean;
}) {
  return (
    <button
      type="button"
      className={
        inline
          ? "barkdown-heading-copy barkdown-heading-copy-inline"
          : "barkdown-heading-copy"
      }
      aria-label={`Copy heading reference ${target}`}
      title={`Copy ${target}`}
      onClick={(event) => {
        event.stopPropagation();
        onCopy();
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

/** VS Code-style reference: file path, heading line, and header name. */
export function headingReference(
  path: string,
  line: string | undefined,
  title: string | undefined,
): string {
  return `${path}:${line ?? "?"}${title ? ` [${title}]` : ""}`;
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

const HEADING_LEVELS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

type HeadingProps = ComponentProps<(typeof HEADING_LEVELS)[number]> & {
  node?: unknown;
};

export function headingComponents(
  path: string,
): Record<string, ComponentType<any>> {
  return Object.fromEntries(
    HEADING_LEVELS.map((tag) => [
      tag,
      (props: HeadingProps) => (
        <HeadingWithCopy path={path} tag={tag} {...props} />
      ),
    ]),
  );
}

function HeadingWithCopy({
  path,
  tag,
  children,
  node: _node,
  ...props
}: {
  path: string;
  tag: (typeof HEADING_LEVELS)[number];
} & HeadingProps) {
  const { copied, copy } = useCopyToClipboard();
  const Tag = tag;
  const attributes = props as Record<string, unknown>;
  const line =
    typeof attributes["data-barkdown-line"] === "string"
      ? attributes["data-barkdown-line"]
      : undefined;
  const className = joinClassNames(
    "barkdown-heading-wrapper",
    typeof props.className === "string" ? props.className : undefined,
  );

  const title = headingTitle(children);
  const copyable = Boolean(path && line);
  const target = copyable ? headingReference(path, line, title) : undefined;

  return (
    <Tag
      {...props}
      className={joinClassNames(
        className,
        copyable ? "barkdown-heading-copyable" : undefined,
      )}
      onClick={copyable ? () => copy(target!) : undefined}
    >
      {children}
      {target ? (
        <HeadingCopyAnchor
          copied={copied}
          inline
          onCopy={() => copy(target)}
          target={target}
        />
      ) : null}
    </Tag>
  );
}
