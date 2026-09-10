import type { ComponentProps } from "react";

/**
 * Public favicon API URL for a website. Google's favicon service returns the
 * site icon at the requested size from the hostname alone.
 */
export function faviconUrl(href: string): string | undefined {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return undefined;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
  return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
}

export type BarkdownLinkProps = ComponentProps<"a"> & { node?: unknown };

/** Small colored badge drawn for a local file link. */
export type FileBadge = { label: string; color: string };

const BADGE_BLUE = "#2563eb";
const BADGE_RED = "#d9383a";
const BADGE_ORANGE = "#ea580c";
const BADGE_GREEN = "#15803d";
const BADGE_AMBER = "#a16207";
const BADGE_PURPLE = "#7c3aed";
const BADGE_PINK = "#db2777";
const BADGE_TEAL = "#0d9488";
const BADGE_SLATE = "#64748b";
const BADGE_INK = "#334155";

/** Badge per file extension. Every other extension keeps the raw label. */
const FILE_BADGES: Readonly<Record<string, FileBadge>> = {
  pdf: { label: "PDF", color: BADGE_RED },
  md: { label: "MD", color: BADGE_BLUE },
  markdown: { label: "MD", color: BADGE_BLUE },
  mdx: { label: "MDX", color: BADGE_BLUE },
  mdown: { label: "MD", color: BADGE_BLUE },
  mkd: { label: "MD", color: BADGE_BLUE },
  mkdn: { label: "MD", color: BADGE_BLUE },
  txt: { label: "TXT", color: BADGE_SLATE },
  text: { label: "TXT", color: BADGE_SLATE },
  html: { label: "HTML", color: BADGE_ORANGE },
  htm: { label: "HTML", color: BADGE_ORANGE },
  doc: { label: "DOC", color: BADGE_BLUE },
  docx: { label: "DOCX", color: BADGE_BLUE },
  odt: { label: "ODT", color: BADGE_BLUE },
  rtf: { label: "RTF", color: BADGE_BLUE },
  xls: { label: "XLS", color: BADGE_GREEN },
  xlsx: { label: "XLSX", color: BADGE_GREEN },
  ods: { label: "ODS", color: BADGE_GREEN },
  csv: { label: "CSV", color: BADGE_GREEN },
  ppt: { label: "PPT", color: BADGE_ORANGE },
  pptx: { label: "PPTX", color: BADGE_ORANGE },
  png: { label: "PNG", color: BADGE_PURPLE },
  jpg: { label: "JPG", color: BADGE_PURPLE },
  jpeg: { label: "JPEG", color: BADGE_PURPLE },
  gif: { label: "GIF", color: BADGE_PURPLE },
  webp: { label: "WEBP", color: BADGE_PURPLE },
  avif: { label: "AVIF", color: BADGE_PURPLE },
  svg: { label: "SVG", color: BADGE_PURPLE },
  mp3: { label: "MP3", color: BADGE_PINK },
  wav: { label: "WAV", color: BADGE_PINK },
  ogg: { label: "OGG", color: BADGE_PINK },
  m4a: { label: "M4A", color: BADGE_PINK },
  flac: { label: "FLAC", color: BADGE_PINK },
  aac: { label: "AAC", color: BADGE_PINK },
  mp4: { label: "MP4", color: BADGE_RED },
  mov: { label: "MOV", color: BADGE_RED },
  avi: { label: "AVI", color: BADGE_RED },
  mkv: { label: "MKV", color: BADGE_RED },
  webm: { label: "WEBM", color: BADGE_RED },
  zip: { label: "ZIP", color: BADGE_AMBER },
  gz: { label: "GZ", color: BADGE_AMBER },
  tgz: { label: "TGZ", color: BADGE_AMBER },
  tar: { label: "TAR", color: BADGE_AMBER },
  rar: { label: "RAR", color: BADGE_AMBER },
  "7z": { label: "7Z", color: BADGE_AMBER },
  json: { label: "JSON", color: BADGE_TEAL },
  yaml: { label: "YAML", color: BADGE_TEAL },
  yml: { label: "YML", color: BADGE_TEAL },
  ts: { label: "TS", color: BADGE_INK },
  tsx: { label: "TSX", color: BADGE_INK },
  js: { label: "JS", color: BADGE_INK },
  jsx: { label: "JSX", color: BADGE_INK },
  py: { label: "PY", color: BADGE_INK },
  go: { label: "GO", color: BADGE_INK },
  rs: { label: "RS", color: BADGE_INK },
  sh: { label: "SH", color: BADGE_INK },
};

/** Badge for a local file link target, or nothing for web or hidden paths. */
export function fileBadge(href: string): FileBadge | undefined {
  if (faviconUrl(href)) return undefined;
  const [path] = href.split(/[?#]/);
  if (!path) return undefined;
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return undefined;
  const extension = name.slice(dot + 1).toLowerCase();
  if (!extension) return undefined;
  return (
    FILE_BADGES[extension] ?? {
      label: extension.slice(0, 4).toUpperCase(),
      color: BADGE_SLATE,
    }
  );
}

/** Favicon for an external link, or a file-type badge for a local file. */
export function LinkIcon({
  className = "barkdown-link-icon",
  href,
}: {
  className?: string;
  href?: string;
}) {
  if (!href) return null;
  const favicon = faviconUrl(href);
  if (favicon) {
    return (
      <img
        alt=""
        className={className}
        height={16}
        loading="lazy"
        src={favicon}
        width={16}
      />
    );
  }
  const badge = fileBadge(href);
  if (!badge) return null;
  const { color, label } = badge;
  const fontSize = label.length <= 2 ? 7 : label.length === 3 ? 6.2 : 5.2;
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 16 16">
      <rect x="0.5" y="0.5" fill={color} height="15" rx="3" width="15" />
      <text
        dominantBaseline="central"
        fill="#fff"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize={fontSize}
        fontWeight="700"
        letterSpacing="0.02em"
        textAnchor="middle"
        x="8"
        y="8.5"
      >
        {label}
      </text>
    </svg>
  );
}

/** Link rendered as [icon][text] with the target website's favicon or a
 * file-type badge for local files. */
export function BarkdownLink({
  children,
  href,
  node: _node,
  ...props
}: BarkdownLinkProps) {
  return (
    <a href={href} {...props}>
      <LinkIcon href={href} />
      {children}
    </a>
  );
}
