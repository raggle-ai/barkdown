import { evaluate } from "@mdx-js/mdx";
import { Check, ChevronDown, Copy, Hash } from "lucide-react";
import {
  Children,
  type ComponentProps,
  type ComponentType,
  type CSSProperties,
  cloneElement,
  isValidElement,
  type JSX,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactMarkdown, {
  type Components as MarkdownComponents,
} from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import * as runtime from "react/jsx-runtime";

import { remarkGithubEmojiImages } from "./emoji.js";
import { BarkdownLink } from "./link.js";
import {
  COLLAPSIBLE_SECTION_TAG,
  rehypeCollapsibleHeadings,
} from "./rehype-collapsible-headings.js";
import {
  CollapsibleSection,
  type CollapsibleSectionProps,
} from "./react-collapsible-sections.js";
import { rehypeHeadingLines } from "./rehype-heading-lines.js";
import {
  HeadingCopyAnchor,
  headingTitle as extractHeadingTitle,
} from "./react-heading-copy.js";
import { BarkdownMermaid } from "./react-mermaid.js";
import { ImagePreview, IframePreview, VideoPreview } from "./react-media.js";
import { useCopyToClipboard } from "./use-copy-to-clipboard.js";

const markdownSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "small",
    "video",
    "source",
    "track",
    "iframe",
  ],
  attributes: {
    ...defaultSchema.attributes,
    video: [
      "src",
      "poster",
      "controls",
      "preload",
      "width",
      "height",
      "loop",
      "muted",
      "playsInline",
    ],
    source: ["src", "type"],
    track: ["src", "kind", "label", "srcLang", "default"],
    // Only src/width/height/allowFullScreen/title: never pass allow, sandbox,
    // referrerpolicy, or other attributes through from note authorship.
    iframe: ["src", "width", "height", "allowFullScreen", "title"],
  },
  protocols: {
    ...defaultSchema.protocols,
    poster: ["http", "https"],
    iframe: ["http", "https"],
  },
};
const sanitizeMarkdown: [typeof rehypeSanitize, typeof markdownSchema] = [
  rehypeSanitize,
  markdownSchema,
];

function joinClassNames(
  ...values: Array<string | undefined>
): string | undefined {
  const className = values.filter(Boolean).join(" ");
  return className || undefined;
}

export type BarkdownMode = "markdown" | "mdx";

export type BarkdownCodeProps = ComponentProps<"code"> & {
  inline?: boolean;
  node?: unknown;
};

type BarkdownElementProps<T extends keyof JSX.IntrinsicElements> =
  ComponentProps<T> & { node?: unknown };

export type BarkdownMarkdownComponents = Record<string, ComponentType<any>>;

export type BarkdownMarkdownProps = {
  value: string;
  className?: string;
  collapsibleHeadings?: boolean;
  components?: BarkdownMarkdownComponents;
  copyCode?: boolean;
  /**
   * Local path to the document file. When set, headings show a hashtag button
   * on hover that copies `path:line` — the heading's source line — in the
   * style of VS Code line references.
   */
  headingCopyPath?: string;
  htmlEmbed?: (path: string) => string | undefined;
  linkIcons?: boolean;
  style?: CSSProperties;
};

export type BarkdownMdxProps = {
  value: string;
  className?: string;
  components?: Record<string, ComponentType<any>>;
  copyCode?: boolean;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
  style?: CSSProperties;
};

export type BarkdownContentProps =
  | (BarkdownMarkdownProps & { mode?: "markdown" })
  | (BarkdownMdxProps & { mode: "mdx" });

export function BarkdownContent(props: BarkdownContentProps) {
  if (props.mode === "mdx") {
    return <BarkdownMdx {...props} />;
  }

  return <BarkdownMarkdown {...props} />;
}

export function BarkdownMarkdown({
  className,
  collapsibleHeadings = false,
  components,
  copyCode = true,
  headingCopyPath,
  htmlEmbed,
  linkIcons = true,
  style,
  value,
}: BarkdownMarkdownProps) {
  const mergedComponents = useMemo<MarkdownComponents>(() => {
    const merged = {
      a: ({ node: _node, ...props }: BarkdownElementProps<"a">) =>
        linkIcons ? <BarkdownLink {...props} /> : <a {...props} />,
      code: (props: BarkdownCodeProps) => (
        <CodeBlock copy={copyCode} htmlEmbed={htmlEmbed} {...props} />
      ),
      pre: (props: ComponentProps<"pre">) => <PreBlock {...props} />,
      img: ImagePreview,
      video: VideoPreview,
      iframe: IframePreview,
      ...(headingCopyPath && !collapsibleHeadings
        ? headingComponents(headingCopyPath)
        : {}),
      ...components,
    };
    // `barkdown-section` groups only exist when the rehype plugin ran.
    // Custom tags are not part of the MarkdownComponents type, so the
    // override is merged before user components and the result is cast.
    if (collapsibleHeadings) {
      return {
        [COLLAPSIBLE_SECTION_TAG]: (props: CollapsibleSectionProps) => (
          <CollapsibleSection headingCopyPath={headingCopyPath} {...props} />
        ),
        ...merged,
      } as MarkdownComponents;
    }
    return merged;
  }, [
    collapsibleHeadings,
    components,
    copyCode,
    headingCopyPath,
    htmlEmbed,
    linkIcons,
  ]);

  const rehypePlugins = useMemo(
    () =>
      collapsibleHeadings
        ? [
            rehypeRaw,
            sanitizeMarkdown,
            rehypeHighlight,
            rehypeKatex,
            rehypeHeadingLines,
            rehypeCollapsibleHeadings,
          ]
        : [
            rehypeRaw,
            sanitizeMarkdown,
            rehypeHighlight,
            rehypeKatex,
            rehypeHeadingLines,
          ],
    [collapsibleHeadings],
  );

  return (
    <div
      className={joinClassNames("barkdown-content", className)}
      data-barkdown=""
      style={style}
    >
      <ReactMarkdown
        components={mergedComponents}
        rehypePlugins={rehypePlugins}
        remarkPlugins={[
          remarkBreaks,
          remarkGfm,
          remarkMath,
          remarkGithubEmojiImages,
        ]}
      >
        {value}
      </ReactMarkdown>
    </div>
  );
}

const HEADING_LEVELS = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;

function headingComponents(path: string): Record<string, ComponentType<any>> {
  return Object.fromEntries(
    HEADING_LEVELS.map((tag) => [
      tag,
      (props: BarkdownElementProps<(typeof HEADING_LEVELS)[number]>) => (
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
} & BarkdownElementProps<(typeof HEADING_LEVELS)[number]>) {
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

  const title = extractHeadingTitle(children);

  return (
    <Tag {...props} className={className}>
      {children}
      {path && line ? (
        <HeadingCopyAnchor line={line} path={path} title={title} />
      ) : null}
    </Tag>
  );
}

function PreBlock({
  children,
  node: _node,
  ...props
}: BarkdownElementProps<"pre">) {
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

export function BarkdownMdx({
  className,
  components,
  copyCode = true,
  fallback = null,
  onError,
  style,
  value,
}: BarkdownMdxProps) {
  const [Content, setContent] = useState<ComponentType<{
    components?: Record<string, ComponentType<any>>;
  }> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const mergedComponents = useMemo(() => {
    return {
      code: (props: BarkdownCodeProps) => (
        <CodeBlock copy={copyCode} {...props} />
      ),
      img: ImagePreview,
      video: VideoPreview,
      iframe: IframePreview,
      ...components,
    };
  }, [components, copyCode]);

  useEffect(() => {
    let cancelled = false;

    async function renderMdx() {
      try {
        const evaluated = await evaluate(value, {
          ...runtime,
          baseUrl: import.meta.url,
        });
        if (cancelled) return;
        setContent(
          () =>
            evaluated.default as ComponentType<{
              components?: Record<string, ComponentType<any>>;
            }>,
        );
        setError(null);
      } catch (caught) {
        const nextError =
          caught instanceof Error ? caught : new Error(String(caught));
        if (cancelled) return;
        setContent(null);
        setError(nextError);
        onError?.(nextError);
      }
    }

    void renderMdx();

    return () => {
      cancelled = true;
    };
  }, [onError, value]);

  if (error) {
    return (
      <div
        className={joinClassNames("barkdown-content", className)}
        data-barkdown=""
        data-barkdown-error=""
        style={style}
      >
        {error.message}
      </div>
    );
  }

  if (!Content) {
    return (
      <div
        className={joinClassNames("barkdown-content", className)}
        data-barkdown=""
        data-barkdown-loading=""
        style={style}
      >
        {fallback}
      </div>
    );
  }

  return (
    <div
      className={joinClassNames("barkdown-content", className)}
      data-barkdown=""
      style={style}
    >
      <Content components={mergedComponents} />
    </div>
  );
}

export function CodeBlock({
  children,
  className,
  copy = true,
  htmlEmbed,
  inline,
  node: _node,
  ...props
}: BarkdownCodeProps & {
  copy?: boolean;
  htmlEmbed?: (path: string) => string | undefined;
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
    const path = text.trim();
    const source = path && !path.includes("\n") ? htmlEmbed?.(path) : undefined;
    if (!source) {
      return (
        <span data-barkdown-html-embed-error="">
          HTML visualization not found: {path || "missing path"}
        </span>
      );
    }
    const filename = path.split("/").at(-1) ?? path;
    const title = filename.replace(/\.html?$/i, "").replaceAll(/[-_]/g, " ");
    return (
      <iframe
        data-barkdown-html-embed=""
        loading="lazy"
        sandbox="allow-scripts"
        srcDoc={source}
        title={title}
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
