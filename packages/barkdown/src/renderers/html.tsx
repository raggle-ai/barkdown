import { useEffect, useState } from "react";

import { type EmbedReader, localPath, useEmbedFile } from "./embed-file.js";
import { EmbedFileTitle, EmbedFrame, EmbedStatus } from "./embed-frame.js";

export function HtmlEmbed({
  path,
  documentPath,
  reader,
}: {
  path: string;
  /** Local path of the Markdown document; resolves the companion path for Copy. */
  documentPath?: string;
  reader: EmbedReader | undefined;
}) {
  const { loading, content, failed, revision, reload } = useEmbedFile(
    reader,
    path,
  );
  const filename = path.split("/").at(-1) || path;
  const title = filename.replace(/\.html?$/i, "").replaceAll(/[-_]/g, " ");
  const href = useSandboxedPage(content, title);

  return (
    <EmbedFrame
      name={filename}
      heading={<EmbedFileTitle filename={filename} />}
      actions={{
        reload: { onClick: reload, disabled: loading },
        copy: { kind: "file path", value: localPath(documentPath, path) },
        open: { href },
      }}
    >
      {loading ? (
        <EmbedStatus>Loading {filename}…</EmbedStatus>
      ) : content !== undefined ? (
        <iframe
          key={revision}
          data-barkdown-html-embed=""
          loading="lazy"
          sandbox="allow-scripts"
          srcDoc={content}
          title={title}
        />
      ) : (
        <EmbedStatus>
          {failed ? "Could not read file" : "File not found"}:{" "}
          {path || "missing path"}
        </EmbedStatus>
      )}
    </EmbedFrame>
  );
}

/**
 * Blob URL of a full-window page that keeps the HTML in a scripts-only
 * sandbox without same-origin access. A raw HTML blob would run with the
 * host page's origin.
 */
function useSandboxedPage(html: string | undefined, title: string) {
  const [link, setLink] = useState<{ html: string; href: string }>();
  useEffect(() => {
    if (html === undefined) return;
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
  return html !== undefined && link?.html === html ? link.href : undefined;
}
