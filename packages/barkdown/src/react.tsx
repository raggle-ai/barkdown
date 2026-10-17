import { evaluate } from "@mdx-js/mdx";
import {
  type ComponentProps,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
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

import { joinClassNames } from "./class-names.js";
import { remarkGithubEmojiImages } from "./emoji.js";
import {
  COLLAPSIBLE_SECTION_TAG,
  rehypeCollapsibleHeadings,
} from "./rehype-collapsible-headings.js";
import { rehypeHeadingLines } from "./rehype-heading-lines.js";
import {
  type BarkdownCodeProps,
  CodeBlock,
  PreBlock,
} from "./renderers/code.js";
import {
  CollapsibleSection,
  type CollapsibleSectionProps,
} from "./renderers/collapsible-sections.js";
import type { EmbedReader } from "./renderers/embed-file.js";
import { headingComponents } from "./renderers/headings.js";
import { BarkdownLink, type BarkdownLinkProps } from "./renderers/link.js";
import {
  ImagePreview,
  IframePreview,
  VideoPreview,
} from "./renderers/media.js";

export { CodeBlock, type BarkdownCodeProps } from "./renderers/code.js";

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
    // GitHub emoji shortcodes become images with this class; without it the
    // sanitizer drops the class and the emoji renders as a media card.
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      ["className", "barkdown-emoji"],
    ],
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

export type BarkdownMode = "markdown" | "mdx";

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
   * style of VS Code line references. Embed Copy actions resolve companion
   * and local media paths next to it.
   */
  headingCopyPath?: string;
  /** Reads a `barkdown-html` companion file. See `EmbedReader`. */
  htmlEmbed?: EmbedReader;
  /** Reads a `barkdown-text` companion file. See `EmbedReader`. */
  textEmbed?: EmbedReader;
  /**
   * Host page that shows a `barkdown-text` companion in a full window. The
   * path is the fence text, relative to the document. Without it, the Open
   * action of text embeds is disabled.
   */
  embedUrl?: (path: string) => string | undefined;
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
  textEmbed,
  embedUrl,
  linkIcons = true,
  style,
  value,
}: BarkdownMarkdownProps) {
  const mergedComponents = useMemo<MarkdownComponents>(() => {
    const merged = {
      a: ({ node: _node, ...props }: BarkdownLinkProps) =>
        linkIcons ? <BarkdownLink {...props} /> : <a {...props} />,
      code: (props: BarkdownCodeProps) => (
        <CodeBlock
          copy={copyCode}
          documentPath={headingCopyPath}
          htmlEmbed={htmlEmbed}
          textEmbed={textEmbed}
          embedUrl={embedUrl}
          {...props}
        />
      ),
      pre: (props: ComponentProps<"pre">) => <PreBlock {...props} />,
      img: (props: ComponentProps<typeof ImagePreview>) => (
        <ImagePreview documentPath={headingCopyPath} {...props} />
      ),
      video: (props: ComponentProps<typeof VideoPreview>) => (
        <VideoPreview documentPath={headingCopyPath} {...props} />
      ),
      iframe: (props: ComponentProps<typeof IframePreview>) => (
        <IframePreview documentPath={headingCopyPath} {...props} />
      ),
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
    textEmbed,
    embedUrl,
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
