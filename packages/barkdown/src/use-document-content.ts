import { useEffect, useRef, useState } from "react";

import {
  type BarkdownLoadState,
  createLoadState,
  loadDocumentContent,
} from "./document-load.js";
import type { BarkdownDocument, BarkdownSource } from "./documents.js";

export type DocumentContentState = {
  /** The complete content, or the loaded head while the rest is read. */
  content: string;
  state: BarkdownLoadState;
  complete: boolean;
};

const READY = createLoadState("ready");

/**
 * Completes a `partial` document through the source's `readRange`, with
 * cancellation when the document or source changes and a per-source cache of
 * completed content. Documents that are complete, or sources without range
 * reads, pass through unchanged.
 */
export function useDocumentContent(
  source: BarkdownSource,
  document: BarkdownDocument | undefined,
): DocumentContentState {
  const completed = useRef<{
    source: BarkdownSource;
    content: Map<string, string>;
  }>(undefined);
  if (!completed.current || completed.current.source !== source) {
    completed.current = { source, content: new Map() };
  }
  const [progress, setProgress] = useState<{
    path: string;
    state: BarkdownLoadState;
  }>();

  const needsLoad = Boolean(document?.partial && source.readRange);
  const cached = document
    ? completed.current.content.get(document.path)
    : undefined;

  useEffect(() => {
    if (!document || !needsLoad || cached !== undefined) return;
    const controller = new AbortController();
    const { path } = document;
    const cache = completed.current;
    void loadDocumentContent(source, document, {
      signal: controller.signal,
      onState: (state) => {
        if (!controller.signal.aborted && state.phase !== "ready") {
          setProgress({ path, state });
        }
      },
    })
      .then((content) => {
        if (controller.signal.aborted) return;
        cache?.content.set(path, content);
        setProgress({ path, state: READY });
      })
      .catch(() => {
        // The failure or cancellation was already reported through onState.
      });
    return () => controller.abort();
  }, [cached, document, needsLoad, source]);

  if (!document) {
    return { content: "", state: createLoadState("idle"), complete: false };
  }
  if (!needsLoad)
    return { content: document.content, state: READY, complete: true };
  if (cached !== undefined)
    return { content: cached, state: READY, complete: true };
  return {
    content: document.content,
    state:
      progress?.path === document.path
        ? progress.state
        : createLoadState("reading"),
    complete: false,
  };
}
