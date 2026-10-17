import { csvParseRows } from "d3-dsv";
import { useEffect, useMemo, useState } from "react";

import { BarkdownMarkdown } from "../react.js";

export type TextEmbedResolver = (
  path: string,
) => string | undefined | Promise<string | undefined>;

export function TextEmbed({
  path,
  resolve,
}: {
  path: string;
  resolve: TextEmbedResolver | undefined;
}) {
  const source = useMemo(
    () => (path && !/[\r\n]/.test(path) ? resolve?.(path) : undefined),
    [path, resolve],
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
  const text = typeof source === "string" ? source : loaded?.source;
  const title = path.split("/").at(-1) ?? path;
  const formatted = /\.(?:md|markdown|csv)$/i.test(path);
  const escaped = text
    ?.replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  const srcDoc =
    escaped === undefined
      ? undefined
      : `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{margin:0;background:#fff;color:#222}pre{margin:0;padding:16px;white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace}</style><pre>${escaped}</pre></html>`;

  return (
    <figure data-barkdown-text-preview="" aria-label={title}>
      <figcaption>{title}</figcaption>
      {loading ? (
        <span role="status">Loading text file…</span>
      ) : text !== undefined && formatted ? (
        <div
          data-barkdown-file-viewport=""
          tabIndex={0}
          role="region"
          aria-label={title}
        >
          {/\.csv$/i.test(path) ? (
            <CsvTable value={text} />
          ) : (
            <BarkdownMarkdown value={text} />
          )}
        </div>
      ) : srcDoc !== undefined ? (
        <iframe srcDoc={srcDoc} sandbox="" title={title} loading="lazy" />
      ) : (
        <span role="status">
          {loaded?.failed ? "Could not load text file" : "Text file not found"}:{" "}
          {path || "missing path"}
        </span>
      )}
    </figure>
  );
}

function CsvTable({ value }: { value: string }) {
  const [header, ...rows] = useMemo(
    () => csvParseRows(value.replace(/^\uFEFF/, "")),
    [value],
  );
  if (!header) return <p>Empty CSV file.</p>;

  return (
    <div data-barkdown="">
      <table data-barkdown-csv-table="">
        <thead>
          <tr>
            {header.map((cell, index) => (
              <th key={index} scope="col">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, column) => (
                <td key={column}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
