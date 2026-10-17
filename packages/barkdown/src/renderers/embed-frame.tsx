import { Check, ChevronDown, Copy, ExternalLink, RotateCw } from "lucide-react";
import type { ReactNode } from "react";

import { useCopyToClipboard } from "../use-copy-to-clipboard.js";
import { LinkIcon } from "./link.js";

export type EmbedActions = {
  reload: { onClick: () => void; disabled?: boolean };
  /** Clipboard value. `kind` names it in the labels. Copy is disabled without a value. */
  copy: { kind: "file path" | "URL"; value?: string };
  /** Open is disabled without an href. */
  open: { href?: string };
};

/**
 * Shared presentation for every embed: one frame, one header with the shared
 * actions, and the renderer's own content below. Documents use a figure.
 * Media uses spans so a card can sit inside a Markdown paragraph.
 */
export function EmbedFrame({
  media = false,
  name,
  heading,
  actions,
  children,
}: {
  media?: boolean;
  /** Filename or media title used in the accessible action labels. */
  name: string;
  heading: ReactNode;
  actions: EmbedActions;
  children: ReactNode;
}) {
  const Frame = media ? "span" : "figure";
  const Header = media ? "span" : "figcaption";
  return (
    <Frame
      data-barkdown-embed={media ? "media" : "document"}
      aria-label={media ? undefined : name}
    >
      <Header data-barkdown-embed-header="">
        {heading}
        <EmbedActionBar name={name} {...actions} />
      </Header>
      {children}
    </Frame>
  );
}

function EmbedActionBar({
  name,
  reload,
  copy,
  open,
}: EmbedActions & { name: string }) {
  const { copied, copy: write } = useCopyToClipboard();
  const copyLabel = `Copy ${copy.kind} for ${name}`;
  return (
    <span data-barkdown-embed-actions="">
      <button
        type="button"
        aria-label={`Reload ${name}`}
        title={`Reload ${name}`}
        disabled={reload.disabled}
        onClick={reload.onClick}
      >
        <RotateCw aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label={copied ? `Copied ${copy.kind} for ${name}` : copyLabel}
        title={copy.value ? `Copy ${copy.kind}: ${copy.value}` : copyLabel}
        disabled={!copy.value}
        onClick={() => {
          if (copy.value) write(copy.value);
        }}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </button>
      <a
        aria-label={`Open ${name}`}
        title={`Open ${name}`}
        href={open.href}
        aria-disabled={open.href ? undefined : true}
        rel="noopener noreferrer"
      >
        <ExternalLink aria-hidden="true" />
      </a>
    </span>
  );
}

/** File-type badge and filename for a document embed header. */
export function EmbedFileTitle({ filename }: { filename: string }) {
  return (
    <span data-barkdown-embed-title="">
      <span data-barkdown-embed-badge="" aria-hidden="true">
        <LinkIcon href={filename} />
      </span>
      <span>{filename}</span>
    </span>
  );
}

/** Thumbnail, title, and expand control for a media embed header. */
export function EmbedMediaToggle({
  title,
  thumbnail,
  open,
  controls,
  disabled = false,
  onToggle,
}: {
  title: string;
  thumbnail: ReactNode;
  open: boolean;
  controls?: string;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      data-barkdown-embed-toggle=""
      aria-expanded={open}
      aria-controls={controls}
      title={`${open ? "Collapse" : "Expand"} ${title}`}
      disabled={disabled}
      onClick={onToggle}
    >
      <span data-barkdown-embed-thumbnail="" aria-hidden="true">
        {thumbnail}
      </span>
      <span data-barkdown-embed-title="">{title}</span>
      <ChevronDown aria-hidden="true" size={16} />
    </button>
  );
}

/** Loading, missing, and failed messages shown in place of embed content. */
export function EmbedStatus({
  media = false,
  children,
}: {
  media?: boolean;
  children: ReactNode;
}) {
  const Status = media ? "span" : "div";
  return (
    <Status data-barkdown-embed-status="" role="status">
      {children}
    </Status>
  );
}
