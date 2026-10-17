import { ChevronDown } from "lucide-react";
import {
  Children,
  type ComponentProps,
  isValidElement,
  type ReactNode,
  useId,
  useState,
} from "react";

type MediaProps<T extends "img" | "video" | "iframe"> = ComponentProps<T> & {
  node?: unknown;
};

function MediaPreview({
  title,
  thumbnail,
  children,
  contentClassName,
}: {
  title: string;
  thumbnail: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="barkdown-media">
      <button
        type="button"
        className="barkdown-media-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="barkdown-media-thumbnail" aria-hidden="true">
          {thumbnail}
        </span>
        <span>{title}</span>
        <ChevronDown aria-hidden="true" size={16} />
      </button>
      <span id={id} hidden={!open}>
        {open ? (
          <span
            className={
              contentClassName
                ? `barkdown-media-content ${contentClassName}`
                : "barkdown-media-content"
            }
          >
            {children}
          </span>
        ) : null}
      </span>
    </span>
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

export function ImagePreview({ node: _node, ...props }: MediaProps<"img">) {
  // Emoji remain inline rather than becoming document media cards.
  if (props.className?.split(/\s+/).includes("barkdown-emoji"))
    return <img {...props} />;

  // Obsidian treats ![](hosted-video-url) as a video embed, not an image.
  // Only trigger on links that resolve to a known player, and only when the
  // author gave no explicit markdown title, so plain image URLs and titled
  // images still render as images.
  if (!props.title && typeof props.src === "string") {
    const provider = hostedPlayer(props.src);
    if (provider) {
      const title = props.alt || provider.name;
      return (
        <MediaPreview title={title} thumbnail={provider.thumb}>
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

  const title =
    props.title ||
    props.alt ||
    mediaTitle(typeof props.src === "string" ? props.src : undefined, "Image");

  return (
    <MediaPreview
      title={title}
      thumbnail={<img src={props.src} alt="" loading="lazy" />}
    >
      <img {...props} />
    </MediaPreview>
  );
}

export function IframePreview({ node: _node, ...props }: MediaProps<"iframe">) {
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
      contentClassName="barkdown-media-iframe"
    >
      <iframe {...props} allowFullScreen title={title} />
    </MediaPreview>
  );
}

export function VideoPreview({ node: _node, ...props }: MediaProps<"video">) {
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
      <MediaPreview title={title} thumbnail={provider.thumb}>
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
        ) : (
          <video src={source} muted playsInline preload="metadata" />
        )
      }
    >
      {/* Unmounting on collapse stops playback and releases the player. */}
      <video {...props} controls autoPlay playsInline />
    </MediaPreview>
  );
}
