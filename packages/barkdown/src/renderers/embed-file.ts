import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Host reader for `barkdown-html` and `barkdown-text` fences. `path` is the
 * fence text, relative to the Markdown document. `request.reload` is true when
 * the reader must read the current file again instead of returning a loaded
 * snapshot. Return `undefined` for a missing or refused file. The reader can
 * return the text directly or return a promise.
 */
export type EmbedReader = (
  path: string,
  request: { reload: boolean },
) => string | undefined | Promise<string | undefined>;

export type EmbedRead = {
  /** The current read has not settled yet. */
  loading: boolean;
  /** File text when the read found the file. */
  content: string | undefined;
  /** The reader threw or its promise rejected. */
  failed: boolean;
  /** Counts reloads of the current path. Key embedded views on it to restart them. */
  revision: number;
  reload: () => void;
};

type Outcome = { content?: string; failed?: boolean };
type Result = Outcome | Promise<Outcome>;

function read(
  reader: EmbedReader | undefined,
  path: string,
  reload: boolean,
): Result {
  if (!reader || !path || /[\r\n]/.test(path)) return {};
  try {
    const value = reader(path, { reload });
    if (typeof value === "string" || value === undefined || value === null) {
      return { content: value ?? undefined };
    }
    return Promise.resolve(value).then(
      (content) => ({ content: content ?? undefined }),
      () => ({ failed: true }),
    );
  } catch {
    return { failed: true };
  }
}

/**
 * Shared read lifecycle for file embeds: loading, missing, and failed states,
 * stale results ignored after a path or reader change, and a reload that asks
 * the host for current content.
 */
export function useEmbedFile(
  reader: EmbedReader | undefined,
  path: string,
): EmbedRead {
  // The first read runs during render so a synchronous reader shows its file
  // in the same pass, including on the server.
  const initial = useMemo(() => read(reader, path, false), [reader, path]);
  const [reloaded, setReloaded] = useState<{
    initial: Result;
    result: Result;
    revision: number;
  }>();
  // A reload issued for another path or reader is stale and ignored.
  const current = reloaded?.initial === initial ? reloaded : undefined;
  const result = current?.result ?? initial;
  const [settled, setSettled] = useState<{
    result: Promise<Outcome>;
    outcome: Outcome;
  }>();

  useEffect(() => {
    if (!(result instanceof Promise)) return;
    let active = true;
    void result.then((outcome) => {
      if (active) setSettled({ result, outcome });
    });
    return () => {
      active = false;
    };
  }, [result]);

  const reload = useCallback(() => {
    const next = read(reader, path, true);
    setReloaded((previous) => ({
      initial,
      result: next,
      revision: (previous?.initial === initial ? previous.revision : 0) + 1,
    }));
  }, [initial, path, reader]);

  const outcome =
    result instanceof Promise
      ? settled?.result === result
        ? settled.outcome
        : undefined
      : result;

  return {
    loading: !outcome,
    content: outcome?.content,
    failed: outcome?.failed === true,
    revision: current?.revision ?? 0,
    reload,
  };
}

/**
 * Local path of a document-relative `relative` path next to `documentPath`.
 * Returns the relative path unchanged when the host gave no document path.
 */
export function localPath(
  documentPath: string | undefined,
  relative: string,
): string {
  const target = relative.split(/[?#]/)[0] ?? "";
  if (!documentPath) return target;
  const separator = documentPath.includes("\\") ? "\\" : "/";
  const parts = documentPath.split(/[\\/]/);
  parts.pop();
  for (const part of target.split("/")) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  return parts.join(separator);
}
