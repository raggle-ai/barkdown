import { csvParseRows } from "d3-dsv";
import { useMemo } from "react";

import { BarkdownMarkdown } from "../react.js";
import { type EmbedReader, localPath, useEmbedFile } from "./embed-file.js";
import { EmbedFileTitle, EmbedFrame, EmbedStatus } from "./embed-frame.js";

export function TextEmbed({
  path,
  documentPath,
  reader,
  url,
}: {
  path: string;
  /** Local path of the Markdown document; resolves the companion path for Copy. */
  documentPath?: string;
  reader: EmbedReader | undefined;
  /** Host page that shows the file in a full window. */
  url?: string;
}) {
  const { loading, content, failed, reload } = useEmbedFile(reader, path);
  const filename = path.split("/").at(-1) || path;

  return (
    <EmbedFrame
      name={filename}
      heading={<EmbedFileTitle filename={filename} />}
      actions={{
        reload: { onClick: reload, disabled: loading },
        copy: { kind: "file path", value: localPath(documentPath, path) },
        open: { href: content === undefined ? undefined : url },
      }}
    >
      {loading ? (
        <EmbedStatus>Loading {filename}…</EmbedStatus>
      ) : content !== undefined ? (
        <div
          data-barkdown-embed-viewport=""
          tabIndex={0}
          role="region"
          aria-label={filename}
        >
          <TextContent path={path} value={content} />
        </div>
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
 * File content by extension: formatted Markdown, a CSV table, or escaped
 * source text. The embed viewport and the explorer's full view share it.
 */
export function TextContent({ path, value }: { path: string; value: string }) {
  if (/\.csv$/i.test(path)) return <CsvTable value={value} />;
  if (/\.(?:md|markdown)$/i.test(path))
    return <BarkdownMarkdown value={value} />;
  return <pre data-barkdown-source-text="">{value}</pre>;
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
