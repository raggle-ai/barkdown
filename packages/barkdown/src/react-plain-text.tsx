import { type CSSProperties, useMemo } from "react";

export type BarkdownPlainTextProps = {
  value: string;
  className?: string;
  style?: CSSProperties;
  /** 1-based source line of the first line of `value`. */
  firstLine?: number;
  /** Show a line-number gutter. Default on. */
  lineNumbers?: boolean;
};

/**
 * Source view: the document as wrapped plain text with one element per line.
 * Every line carries `id="L<line>"`, so `#L<line>` fragments and `path:line`
 * references resolve without parsing Markdown. This is the fallback above the
 * plain-text size threshold and the reader's "source" view.
 */
export function BarkdownPlainText({
  className,
  firstLine = 1,
  lineNumbers = true,
  style,
  value,
}: BarkdownPlainTextProps) {
  const lines = useMemo(() => {
    const split = value.split("\n");
    if (value.endsWith("\n")) split.pop();
    return split;
  }, [value]);
  const width = String(firstLine + lines.length).length;

  return (
    <div
      className={["barkdown-content", className].filter(Boolean).join(" ")}
      data-barkdown=""
      style={style}
    >
      <pre
        data-barkdown-plain-text=""
        data-barkdown-line-numbers={lineNumbers ? "" : undefined}
        style={{ "--barkdown-gutter": `${width}ch` } as CSSProperties}
      >
        {lines.map((line, offset) => {
          const number = firstLine + offset;
          return (
            <span key={number} id={`L${number}`} data-barkdown-line={number}>
              {lineNumbers ? (
                <span aria-hidden="true" data-barkdown-line-number="">
                  {number}
                </span>
              ) : null}
              {line}
              {"\n"}
            </span>
          );
        })}
      </pre>
    </div>
  );
}
