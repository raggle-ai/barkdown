import { Check, Copy, Link2, RotateCw } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { useCopyToClipboard } from "../use-copy-to-clipboard.js";

export type HtmlEmbedResolver = (
  path: string,
) => string | undefined | Promise<string | undefined>;

export function HtmlEmbed({
  path,
  documentPath,
  resolve,
}: {
  path: string;
  documentPath?: string;
  resolve: HtmlEmbedResolver | undefined;
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
