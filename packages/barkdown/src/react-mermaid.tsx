import { useEffect, useRef, useState } from "react";
import type { Mounted } from "pele";

export type BarkdownMermaidProps = {
  diagram: string;
  title?: string;
};

export function BarkdownMermaid({
  diagram,
  title = "Mermaid diagram",
}: BarkdownMermaidProps) {
  const surface = useRef<HTMLDivElement>(null);
  const mounted = useRef<Mounted>(undefined);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const source = diagram.trim();

  useEffect(() => {
    if (mounted.current) {
      mounted.current.update(source);
      return;
    }

    let active = true;

    import("pele").then(
      ({ mount }) => {
        if (!active || !surface.current) return;
        mounted.current = mount(surface.current, source);
        setReady(true);
      },
      (caught: unknown) => {
        if (!active) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to render diagram.",
        );
      },
    );

    return () => {
      active = false;
    };
  }, [source]);

  useEffect(
    () => () => {
      mounted.current?.destroy();
      mounted.current = undefined;
    },
    [],
  );

  return (
    <figure aria-label={title} data-barkdown-mermaid="">
      <figcaption data-barkdown-mermaid-toolbar="">
        <span data-barkdown-mermaid-title="">{title}</span>
      </figcaption>
      <div data-barkdown-mermaid-viewport="">
        {error ? (
          <div data-barkdown-mermaid-error="">{error}</div>
        ) : ready ? null : (
          <div data-barkdown-mermaid-status="">Rendering diagram…</div>
        )}
        <div ref={surface} data-barkdown-mermaid-surface="" />
      </div>
    </figure>
  );
}
