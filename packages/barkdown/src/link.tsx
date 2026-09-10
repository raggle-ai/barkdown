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

/** Favicon for a link target, or nothing when no website icon exists. */
export function LinkIcon({
  className = "barkdown-link-icon",
  href,
}: {
  className?: string;
  href?: string;
}) {
  const src = href ? faviconUrl(href) : undefined;
  if (!src) return null;
  return (
    <img
      alt=""
      className={className}
      height={16}
      loading="lazy"
      src={src}
      width={16}
    />
  );
}

/** Link rendered as [icon][text] using the target website's favicon. */
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
