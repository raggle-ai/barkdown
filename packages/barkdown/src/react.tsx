import { evaluate } from "@mdx-js/mdx";
import { Check, Copy, Link2, RotateCw } from "lucide-react";
import {
  type ComponentProps,
  type ComponentType,
  type CSSProperties,
  isValidElement,
  type JSX,
  type ReactNode,
  type RefObject,
  useCallback,
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

import { type DocumentIndex, cachedDocumentIndex } from "./document-index.js";
import { remarkGithubEmojiImages } from "./emoji.js";
import {
  type BarkdownLargeDocumentInput,
  type BarkdownRenderMode,
  renderMode,
  resolveLargeDocumentPolicy,
} from "./large-document-policy.js";
import { highlightCode } from "./lazy-highlight.js";
import { BarkdownLink } from "./link.js";
import {
  COLLAPSIBLE_SECTION_TAG,
  rehypeCollapsibleHeadings,
} from "./rehype-collapsible-headings.js";
import {
  CollapsibleSection,
  type CollapsibleSectionProps,
} from "./react-collapsible-sections.js";
import {
  type RehypeHeadingsOptions,
  rehypeHeadings,
} from "./rehype-headings.js";
import {
  HeadingCopyAnchor,
  headingReference,
  headingTitle as extractHeadingTitle,
} from "./react-heading-copy.js";
import { BarkdownMermaid } from "./react-mermaid.js";
import { ImagePreview, IframePreview, VideoPreview } from "./react-media.js";
import { BarkdownPlainText } from "./react-plain-text.js";
import {
  type BarkdownRenderProgress,
  type DocumentChunk,
  ProgressiveMarkdown,
  useFragmentNavigation,
} from "./react-progressive.js";
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
const remarkPlugins = [
  remarkBreaks,
  remarkGfm,
  remarkMath,
  remarkGithubEmojiImages,
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
  /** Resolves companion HTML, from a dataset or an asynchronous host reader. */
  htmlEmbed?: (
    path: string,
  ) => string | undefined | Promise<string | undefined>;
  linkIcons?: boolean;
  style?: CSSProperties;
  /**
   * Index of the document `value` belongs to. Computed from `value` and
   * cached when omitted. Pass it when `value` is a slice of a document, such
   * as the body after frontmatter, together with `firstLine`.
   */
  index?: DocumentIndex;
  /** 1-based source line of the first line of `value`. Default 1. */
  firstLine?: number;
  /**
   * Large-document policy: thresholds for progressive section rendering,
   * lazy syntax highlighting, and the plain-text fallback. Omit for the
   * defaults; pass `false` to render in one pass regardless of size.
   */
  largeDocument?: BarkdownLargeDocumentInput;
  /**
   * Rendering progress. One-pass renders report a single `done` call;
   * progressive renders report each slice.
   */
  onRenderProgress?: (progress: BarkdownRenderProgress) => void;
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
  firstLine = 1,
  headingCopyPath,
  htmlEmbed,
  index,
  largeDocument,
  linkIcons = true,
  onRenderProgress,
  style,
  value,
}: BarkdownMarkdownProps) {
  const documentIndex = useMemo(
    () => index ?? cachedDocumentIndex(value),
    [index, value],
  );
  const policyKey = JSON.stringify(largeDocument ?? null);
  const policy = useMemo(
    () =>
      largeDocument === false
        ? undefined
        : resolveLargeDocumentPolicy(largeDocument),
    // The policy is plain data; its serialized form is the identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [policyKey],
  );
  const mode: BarkdownRenderMode = policy
    ? renderMode(
        { bytes: documentIndex.bytes, lines: documentIndex.lines },
        policy,
      )
    : "standard";
  const lazyHighlight =
    mode === "progressive" && Boolean(policy?.lazyHighlight);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(onRenderProgress);
  progressRef.current = onRenderProgress;

  const mergedComponents = useMemo<MarkdownComponents>(() => {
    const merged = {
      a: ({ node: _node, ...props }: BarkdownElementProps<"a">) =>
        linkIcons ? <BarkdownLink {...props} /> : <a {...props} />,
      code: (props: BarkdownCodeProps) => (
        <CodeBlock
          copy={copyCode}
          documentPath={headingCopyPath}
          highlight={lazyHighlight ? "lazy" : "eager"}
          htmlEmbed={htmlEmbed}
          {...props}
        />
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
    lazyHighlight,
    linkIcons,
  ]);

  const pluginsFor = useCallback(
    (line: number) => [
      rehypeRaw,
      sanitizeMarkdown,
      ...(lazyHighlight ? [] : [rehypeHighlight]),
      rehypeKatex,
      [rehypeHeadings, { index: documentIndex, firstLine: line }] as [
        typeof rehypeHeadings,
        RehypeHeadingsOptions,
      ],
      ...(collapsibleHeadings ? [rehypeCollapsibleHeadings] : []),
    ],
    [collapsibleHeadings, documentIndex, lazyHighlight],
  );
  const rehypePlugins = useMemo(
    () => pluginsFor(firstLine),
    [firstLine, pluginsFor],
  );
  const renderChunk = useCallback(
    (text: string, chunk: DocumentChunk) => (
      <ReactMarkdown
        components={mergedComponents}
        rehypePlugins={pluginsFor(chunk.startLine)}
        remarkPlugins={remarkPlugins}
        remarkRehypeOptions={{
          clobberPrefix: `user-content-${chunk.startLine}-`,
        }}
      >
        {text}
      </ReactMarkdown>
    ),
    [mergedComponents, pluginsFor],
  );
  const definitions = useMemo(
    () =>
      documentIndex.definitions.length
        ? `\n\n${documentIndex.definitions.join("\n")}\n`
        : "",
    [documentIndex],
  );

  useFragmentNavigation(
    containerRef,
    documentIndex,
    mode === "standard" ? undefined : () => true,
  );
  useEffect(() => {
    if (mode === "progressive") return;
    progressRef.current?.({ rendered: 1, total: 1, done: true });
  }, [mode, value]);

  if (mode === "plain-text") {
    return (
      <BarkdownPlainText
        className={className}
        firstLine={firstLine}
        style={style}
        value={value}
      />
    );
  }

  return (
    <div
      className={joinClassNames("barkdown-content", className)}
      data-barkdown=""
      data-barkdown-progressive={mode === "progressive" ? "" : undefined}
      ref={containerRef}
      style={style}
    >
      {mode === "progressive" && policy ? (
        <ProgressiveMarkdown
          containerRef={containerRef}
          definitions={definitions}
          firstLine={firstLine}
          index={documentIndex}
          keepNesting={collapsibleHeadings}
          onProgress={onRenderProgress}
          policy={policy}
          renderChunk={renderChunk}
          value={value}
        />
      ) : (
        <ReactMarkdown
          components={mergedComponents}
          rehypePlugins={rehypePlugins}
          remarkPlugins={remarkPlugins}
        >
          {value}
        </ReactMarkdown>
      )}
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

  const title = extractHeadingTitle(children);
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

function HtmlEmbed({
  path,
  documentPath,
  resolve,
}: {
  path: string;
  documentPath?: string;
  resolve: BarkdownMarkdownProps["htmlEmbed"];
}) {
  const [revision, setRevision] = useState(0);
  const source = useMemo(
    () => (path && !path.includes("\n") ? resolve?.(path) : undefined),
    [path, resolve, revision],
  );
  const pending = typeof source === "string" ? undefined : source;
  const [result, setResult] = useState<{
    pending: Promise<string | undefined>;
    source?: string;
    failed?: boolean;
  }>();
  useEffect(() => {
    if (!pending) return;
    let active = true;
    void pending.then(
      (source) => {
        if (active) setResult({ pending, source });
      },
      () => {
        if (active) setResult({ pending, failed: true });
      },
    );
    return () => {
      active = false;
    };
  }, [pending]);

  const loading = Boolean(pending && result?.pending !== pending);
  const loaded = pending && result?.pending === pending ? result : undefined;
  const html = typeof source === "string" ? source : loaded?.source;
  const filename = path.split("/").at(-1) ?? path;
  const title = filename.replace(/\.html?$/i, "").replaceAll(/[-_]/g, " ");
  const filePath = documentPath
    ? `${documentPath.slice(0, documentPath.lastIndexOf("/") + 1)}${path}`
    : path;
  return (
    <HtmlPreview
      html={html}
      path={filePath}
      title={title}
      loading={loading}
      onReload={() => setRevision((value) => value + 1)}
    >
      {loading ? (
        <span role="status">Loading HTML visualization…</span>
      ) : html ? (
        <iframe
          key={revision}
          data-barkdown-html-embed=""
          loading="lazy"
          sandbox="allow-scripts"
          srcDoc={html}
          title={title}
        />
      ) : (
        <span data-barkdown-html-embed-error="">
          {loaded?.failed
            ? "Could not load HTML visualization"
            : "HTML visualization not found"}
          : {path || "missing path"}
        </span>
      )}
    </HtmlPreview>
  );
}

function HtmlPreview({
  children,
  html,
  loading,
  onReload,
  path,
  title,
}: {
  children: ReactNode;
  html?: string;
  loading: boolean;
  onReload: () => void;
  path: string;
  title: string;
}) {
  const { copied, copy } = useCopyToClipboard();
  const [link, setLink] = useState<{ html: string; href: string }>();
  useEffect(() => {
    if (!html) return;
    // Keep the new tab sandboxed too: a raw HTML blob would inherit host access.
    const page = document.implementation.createHTMLDocument(title);
    const charset = page.createElement("meta");
    charset.setAttribute("charset", "utf-8");
    page.head.prepend(charset);
    page.documentElement.style.height = "100%";
    page.body.style.cssText = "margin:0;height:100%";
    const frame = page.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts");
    frame.title = title;
    frame.srcdoc = html;
    frame.style.cssText = "display:block;width:100%;height:100%;border:0";
    page.body.append(frame);
    const href = URL.createObjectURL(
      new Blob(["<!doctype html>", page.documentElement.outerHTML], {
        type: "text/html;charset=utf-8",
      }),
    );
    setLink({ html, href });
    return () => URL.revokeObjectURL(href);
  }, [html, title]);

  return (
    <figure data-barkdown-html-preview="" aria-label={title}>
      <figcaption data-barkdown-html-toolbar="">
        <span>{title}</span>
        <span data-barkdown-html-actions="">
          <button
            type="button"
            aria-label="Reload HTML"
            title="Reload HTML"
            disabled={loading}
            onClick={onReload}
          >
            <RotateCw aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={
              copied ? "HTML file path copied" : "Copy HTML file path"
            }
            title={`Copy HTML file path: ${path}`}
            onClick={() => copy(path)}
          >
            {copied ? (
              <Check aria-hidden="true" />
            ) : (
              <Copy aria-hidden="true" />
            )}
          </button>
          <a
            data-barkdown-html-open=""
            aria-label="Open HTML"
            title="Open HTML"
            href={html && link?.html === html ? link.href : undefined}
            aria-disabled={!html || undefined}
            rel="noopener noreferrer"
          >
            <Link2 aria-hidden="true" />
          </a>
        </span>
      </figcaption>
      {children}
    </figure>
  );
}

/**
 * Highlights a code block once it scrolls near the viewport. Used when the
 * Markdown pipeline skipped `rehype-highlight` for a large document.
 */
function useLazyHighlight(
  ref: RefObject<HTMLElement | null>,
  code: string,
  language: string | undefined,
): string | undefined {
  const [html, setHtml] = useState<{ code: string; html: string }>();
  useEffect(() => {
    if (!language) return;
    const element = ref.current;
    if (!element) return;
    let cancelled = false;
    const start = () => {
      void highlightCode(code, language).then((result) => {
        if (!cancelled && result) setHtml({ code, html: result });
      });
    };
    if (typeof IntersectionObserver === "undefined") {
      start();
      return () => {
        cancelled = true;
      };
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        start();
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [code, language, ref]);
  return html?.code === code ? html.html : undefined;
}

export function CodeBlock({
  children,
  className,
  copy = true,
  documentPath,
  highlight = "eager",
  htmlEmbed,
  inline,
  node: _node,
  ...props
}: BarkdownCodeProps & {
  copy?: boolean;
  documentPath?: string;
  /** `lazy` highlights the block itself when it comes near the viewport. */
  highlight?: "eager" | "lazy";
  htmlEmbed?: BarkdownMarkdownProps["htmlEmbed"];
}) {
  const { copied, copy: copyText } = useCopyToClipboard();
  const codeRef = useRef<HTMLElement>(null);
  const text = String(children ?? "").replace(/\n$/, "");
  const language = /(?:^|\s)language-([\w+-]+)/
    .exec(className ?? "")?.[1]
    ?.toLowerCase();
  const block = inline === false || Boolean(className) || text.includes("\n");
  const highlighted = useLazyHighlight(
    codeRef,
    text,
    highlight === "lazy" && block ? language : undefined,
  );

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
      {highlighted ? (
        <code
          className={joinClassNames("hljs", className)}
          dangerouslySetInnerHTML={{ __html: highlighted }}
          ref={codeRef}
          {...props}
        />
      ) : (
        <code className={className} ref={codeRef} {...props}>
          {children}
        </code>
      )}
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
