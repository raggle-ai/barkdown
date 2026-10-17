/**
 * Document load phases with elapsed time and progress, plus range loading
 * for sources that serve long documents in parts.
 *
 * Phases: `listing` (the folder dataset), `reading` (the document's
 * remaining lines), `indexing`, `rendering`, then `ready`. A load ends in
 * `error` or `cancelled` when its signal aborts, and a stale result from an
 * earlier request is never applied.
 */
import type {
  BarkdownDocument,
  BarkdownRangeResult,
  BarkdownSource,
} from "./documents.js";

export type BarkdownLoadPhase =
  | "idle"
  | "listing"
  | "reading"
  | "indexing"
  | "rendering"
  | "ready"
  | "error"
  | "cancelled";

export type BarkdownLoadState = {
  phase: BarkdownLoadPhase;
  /** 0 to 1 when the remaining work is known. */
  progress?: number;
  /** Short detail such as "4,200 / 11,745 lines". */
  detail?: string;
  startedAt: number;
  updatedAt: number;
  elapsedMs: number;
  error?: Error;
};

export const loadPhaseLabels: Record<BarkdownLoadPhase, string> = {
  idle: "Idle",
  listing: "Listing files",
  reading: "Reading",
  indexing: "Indexing",
  rendering: "Rendering",
  ready: "Ready",
  error: "Failed",
  cancelled: "Cancelled",
};

export function createLoadState(
  phase: BarkdownLoadPhase = "idle",
  now = Date.now(),
): BarkdownLoadState {
  return { phase, startedAt: now, updatedAt: now, elapsedMs: 0 };
}

export type LoadStatePatch = Partial<
  Pick<BarkdownLoadState, "phase" | "progress" | "detail" | "error">
>;

export function advanceLoadState(
  state: BarkdownLoadState,
  patch: LoadStatePatch,
  now = Date.now(),
): BarkdownLoadState {
  const restart = state.phase === "idle" || !isLoading(state);
  const startedAt =
    restart && patch.phase && isLoadingPhase(patch.phase)
      ? now
      : state.startedAt;
  return {
    phase: patch.phase ?? state.phase,
    progress: "progress" in patch ? patch.progress : state.progress,
    detail: "detail" in patch ? patch.detail : state.detail,
    error: patch.error ?? (patch.phase === "error" ? state.error : undefined),
    startedAt,
    updatedAt: now,
    elapsedMs: Math.max(0, now - startedAt),
  };
}

export function isLoadingPhase(phase: BarkdownLoadPhase): boolean {
  return (
    phase === "listing" ||
    phase === "reading" ||
    phase === "indexing" ||
    phase === "rendering"
  );
}

export function isLoading(state: BarkdownLoadState): boolean {
  return isLoadingPhase(state.phase);
}

/** "0.8 s", "12 s", or "1:05" for longer waits. */
export function formatElapsed(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 10) return `${seconds.toFixed(1)} s`;
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

/** Error thrown when a load is cancelled through its signal. */
export class LoadCancelledError extends Error {
  override name = "LoadCancelledError";
  constructor() {
    super("Document load cancelled");
  }
}

export type LoadDocumentOptions = {
  signal?: AbortSignal;
  /** Lines requested per range read. Default 2000. */
  chunkLines?: number;
  onState?: (state: BarkdownLoadState) => void;
  now?: () => number;
};

/**
 * Completes a partially loaded document by reading the remaining lines in
 * ranges, reporting `reading` progress after each range. Documents that are
 * already complete resolve at once. Throws `LoadCancelledError` when the
 * signal aborts, after which no further state is reported.
 */
export async function loadDocumentContent(
  source: BarkdownSource,
  document: BarkdownDocument,
  options: LoadDocumentOptions = {},
): Promise<string> {
  const { signal, chunkLines = 2000, onState, now = Date.now } = options;
  let state = createLoadState("idle", now());
  const report = (patch: LoadStatePatch) => {
    state = advanceLoadState(state, patch, now());
    onState?.(state);
  };
  const partial = document.partial;
  if (!partial || !source.readRange) {
    report({ phase: "ready", progress: 1 });
    return document.content;
  }

  const totalLines = partial.lines;
  const parts = [document.content];
  let loadedLines = countLines(document.content);
  report({
    phase: "reading",
    progress: totalLines ? loadedLines / totalLines : undefined,
    detail: `${loadedLines.toLocaleString()} / ${totalLines.toLocaleString()} lines`,
  });

  try {
    while (loadedLines < totalLines) {
      if (signal?.aborted) throw new LoadCancelledError();
      const range: BarkdownRangeResult = await source.readRange(
        document.path,
        {
          startLine: loadedLines + 1,
          endLine: Math.min(totalLines, loadedLines + chunkLines),
        },
        signal ? { signal } : undefined,
      );
      if (signal?.aborted) throw new LoadCancelledError();
      if (range.content === "" && range.endLine < range.startLine) break;
      parts.push(range.content);
      loadedLines = range.endLine;
      if (range.totalLines < totalLines && range.totalLines >= loadedLines) {
        // The file shrank since the listing; stop at its current end.
        break;
      }
      report({
        phase: "reading",
        progress: Math.min(1, loadedLines / totalLines),
        detail: `${loadedLines.toLocaleString()} / ${totalLines.toLocaleString()} lines`,
      });
    }
  } catch (error) {
    if (error instanceof LoadCancelledError || isAbortError(error)) {
      report({ phase: "cancelled" });
      throw new LoadCancelledError();
    }
    report({
      phase: "error",
      error: error instanceof Error ? error : new Error(String(error)),
    });
    throw error;
  }
  report({ phase: "ready", progress: 1, detail: undefined });
  return parts.join("");
}

function countLines(text: string): number {
  if (!text) return 0;
  let count = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) === 10) count += 1;
  }
  return text.endsWith("\n") ? count : count + 1;
}

export function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "LoadCancelledError")
  );
}
