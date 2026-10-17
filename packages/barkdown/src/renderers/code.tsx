import { Check, Copy } from "lucide-react";
import { type ComponentProps, isValidElement } from "react";

import { useCopyToClipboard } from "../use-copy-to-clipboard.js";
import { HtmlEmbed, type HtmlEmbedResolver } from "./html.js";
import { BarkdownMermaid } from "./mermaid.js";

export type BarkdownCodeProps = ComponentProps<"code"> & {
  inline?: boolean;
  node?: unknown;
};

export function PreBlock({
  children,
  node: _node,
  ...props
}: ComponentProps<"pre"> & { node?: unknown }) {
  if (
    isValidElement<{ className?: string }>(children) &&
    children.props.className
      ?.split(/\s+/)
      .some(
        (className) =>
          className === "language-mermaid" ||
          className === "language-barkdown-html",
      )
  ) {
    return children;
  }

  return <pre {...props}>{children}</pre>;
}

export function CodeBlock({
  children,
  className,
  copy = true,
  documentPath,
  htmlEmbed,
  inline,
  node: _node,
  ...props
}: BarkdownCodeProps & {
  copy?: boolean;
  documentPath?: string;
  htmlEmbed?: HtmlEmbedResolver;
}) {
  const { copied, copy: copyText } = useCopyToClipboard();
  const text = String(children ?? "").replace(/\n$/, "");
  const language = /(?:^|\s)language-([\w+-]+)/
    .exec(className ?? "")?.[1]
    ?.toLowerCase();
  const block = inline === false || Boolean(className) || text.includes("\n");

  if (language === "mermaid") {
    return <BarkdownMermaid diagram={text} />;
  }
  if (language === "barkdown-html") {
    return (
      <HtmlEmbed
        path={text.trim()}
        documentPath={documentPath}
        resolve={htmlEmbed}
      />
    );
  }

  if (!block) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  return (
    <span data-barkdown-code-block="">
      <code className={className} {...props}>
        {children}
      </code>
      {copy ? (
        <button
          aria-label="Copy code"
          data-barkdown-code-copy=""
          type="button"
          onClick={() => {
            copyText(text);
          }}
        >
          {copied ? (
            <Check aria-hidden="true" size={14} />
          ) : (
            <Copy aria-hidden="true" size={14} />
          )}
        </button>
      ) : null}
    </span>
  );
}
