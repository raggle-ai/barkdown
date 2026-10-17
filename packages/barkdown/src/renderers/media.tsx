import {
  Children,
  type ComponentProps,
  Fragment,
  isValidElement,
  type ReactNode,
  useId,
  useState,
} from "react";

import { localPath } from "./embed-file.js";
import { EmbedFrame, EmbedMediaToggle, EmbedStatus } from "./embed-frame.js";

type MediaProps<T extends "img" | "video" | "iframe"> = ComponentProps<T> & {
  node?: unknown;
  /** Local path of the Markdown document; resolves local media paths for Copy. */
  documentPath?: string;
};

/**
 * Collapsed media card with the shared header and actions. The expanded
 * content mounts on demand and unmounts on collapse, which stops playback.
 * Copy and Open use the original source, never a generated player URL.
 */
function MediaPreview({
  title,
  thumbnail,
  source,
  documentPath,
  children,
}: {
  title: string;
  thumbnail: ReactNode;
  source: string | undefined;
  documentPath?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const id = useId();
  const remote = source !== undefined && /^[a-z][a-z0-9+.-]*:/i.test(source);

  return (
    <EmbedFrame
      media
      name={title}
      heading={
        <EmbedMediaToggle
          title={title}
          thumbnail={<Fragment key={revision}>{thumbnail}</Fragment>}
          open={open}
          controls={source === undefined ? undefined : id}
          disabled={source === undefined}
          onToggle={() => setOpen((current) => !current)}
        />
      }
      actions={{
        // Reload remounts the expanded view and the thumbnail. While collapsed
        // it does not open the card or start a player.
        reload: { onClick: () => setRevision((value) => value + 1) },
        copy: {
          kind: remote ? "URL" : "file path",
          value:
            source === undefined
              ? undefined
              : remote
                ? source
                : localPath(documentPath, source),
        },
        open: { href: source },
      }}
    >
      {source === undefined ? (
        <EmbedStatus media>Missing media source</EmbedStatus>
      ) : (
        <span id={id} hidden={!open}>
          {open ? (
            <span key={revision} data-barkdown-embed-viewport="">
              {children}
            </span>
          ) : null}
        </span>
      )}
    </EmbedFrame>
  );
}

function mediaTitle(src: string | undefined, fallback: string): string {
  return src?.split(/[?#]/)[0]?.split("/").filter(Boolean).at(-1) || fallback;
}

/** Player iframe and thumbnail for links hosted by a public video platform
 * (YouTube, Vimeo, Streamable, Loom). Returns undefined for other URLs so
 * plain <video src> keeps handling raw MP4 files. */
function hostedPlayer(url: string):
  | {
      name: string;
      thumb: ReactNode;
      iframe: { src: string };
    }
  | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  if (url.match(/\/embed\/[A-Za-z0-9_-]{11}/)) {
    const embedId = url.match(/\/embed\/([A-Za-z0-9_-]{11})/)![1];
    return embedPlayer(url, undefined, `YouTube video ${embedId}`);
  }
  if (
    parsed.hostname.endsWith("youtube.com") ||
    parsed.hostname === "youtube.com" ||
    parsed.hostname === "m.youtube.com"
  ) {
    const videoId =
      parsed.searchParams.get("v") ??
      parsed.pathname.split("/").filter(Boolean).pop();
    // Share links like https://youtu.be/ID
    if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId))
      return embedPlayer(
        `https://www.youtube-nocookie.com/embed/${videoId}`,
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        `YouTube video ${videoId}`,
      );
  }
  if (parsed.hostname === "youtu.be") {
    const videoId = parsed.pathname.replace("/", "");
    if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId))
      return embedPlayer(
        `https://www.youtube-nocookie.com/embed/${videoId}`,
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        `YouTube video ${videoId}`,
      );
  }
  if (parsed.hostname.endsWith("vimeo.com")) {
    const videoId = parsed.pathname.split("/").filter(Boolean)[0];
    if (videoId && /^\d+$/.test(videoId))
      return embedPlayer(
        `https://player.vimeo.com/video/${videoId}`,
        undefined,
        `Vimeo video ${videoId}`,
      );
  }
  if (
    parsed.hostname.endsWith("streamable.com") &&
    parsed.pathname.startsWith("/")
  ) {
    const videoId = parsed.pathname.split("/").filter(Boolean)[0];
    if (videoId && videoId !== "")
      return embedPlayer(
        `https://streamable.com/e/${videoId}?nocontrols=0`,
        undefined,
        `Streamable video ${videoId}`,
      );
  }
  if (
    parsed.hostname.endsWith("loom.com") &&
    parsed.pathname.includes("/share/")
  ) {
    const videoId = parsed.pathname.split("/share/")[1]?.split("/")[0];
    if (videoId && /^[a-f0-9]+$/.test(videoId))
      return embedPlayer(
        `https://www.loom.com/embed/${videoId}`,
        undefined,
        `Loom video ${videoId}`,
      );
  }
  return undefined;
}

function embedPlayer(
  src: string,
  thumbUrl?: string,
  name?: string,
): { name: string; thumb: ReactNode; iframe: { src: string } } {
  return {
    name: name ?? "Video",
    thumb: thumbUrl ? <img src={thumbUrl} alt="" loading="lazy" /> : null,
    iframe: { src },
  };
}

export function ImagePreview({
  documentPath,
  node: _node,
  ...props
}: MediaProps<"img">) {
  // Emoji remain inline rather than becoming document media cards.
  if (props.className?.split(/\s+/).includes("barkdown-emoji"))
    return <img {...props} />;

  const src = typeof props.src === "string" ? props.src : undefined;

  // Obsidian treats ![](hosted-video-url) as a video embed, not an image.
  // Only trigger on links that resolve to a known player, and only when the
  // author gave no explicit markdown title, so plain image URLs and titled
  // images still render as images.
  if (!props.title && src) {
    const provider = hostedPlayer(src);
    if (provider) {
      const title = props.alt || provider.name;
      return (
        <MediaPreview
          title={title}
          thumbnail={provider.thumb}
          source={src}
          documentPath={documentPath}
        >
          <iframe
            {...provider.iframe}
            allowFullScreen
            loading="lazy"
            title={title}
          />
        </MediaPreview>
      );
    }
  }

  const title = props.title || props.alt || mediaTitle(src, "Image");

  return (
    <MediaPreview
      title={title}
      thumbnail={src ? <img src={src} alt="" loading="lazy" /> : null}
      source={src}
      documentPath={documentPath}
    >
      <img {...props} />
    </MediaPreview>
  );
}

export function IframePreview({
  documentPath,
  node: _node,
  ...props
}: MediaProps<"iframe">) {
  // Reuse the hosted-player naming so <iframe src="youtube|vimeo|...">
  // titles like Obsidian's video embeds instead of a bare URL path.
  const provider =
    !props.title && props.src ? hostedPlayer(props.src) : undefined;
  const title =
    props.title || provider?.name || mediaTitle(props.src, "Embedded page");
  return (
    <MediaPreview
      title={title}
      thumbnail={provider?.thumb ?? null}
      source={props.src}
      documentPath={documentPath}
    >
      <iframe {...props} allowFullScreen title={title} />
    </MediaPreview>
  );
}

export function VideoPreview({
  documentPath,
  node: _node,
  ...props
}: MediaProps<"video">) {
  const source =
    props.src ||
    Children.toArray(props.children).reduce<string | undefined>(
      (found, child) =>
        found ||
        (isValidElement<{ src?: string }>(child) && child.type === "source"
          ? child.props.src
          : undefined),
      undefined,
    );
  const provider = source ? hostedPlayer(source) : undefined;
  const title = props.title || provider?.name || mediaTitle(source, "Video");
  if (provider) {
    return (
      <MediaPreview
        title={title}
        thumbnail={provider.thumb}
        source={source}
        documentPath={documentPath}
      >
        <iframe
          {...provider.iframe}
          allowFullScreen
          loading="lazy"
          title={title}
        />
      </MediaPreview>
    );
  }
  return (
    <MediaPreview
      title={title}
      thumbnail={
        props.poster ? (
          <img src={props.poster} alt="" loading="lazy" />
        ) : source ? (
          <video src={source} muted playsInline preload="metadata" />
        ) : null
      }
      source={source}
      documentPath={documentPath}
    >
      {/* Unmounting on collapse stops playback and releases the player. */}
      <video {...props} controls autoPlay playsInline />
    </MediaPreview>
  );
}
