import "@raggle-ai/barkdown/styles.css";
import "@raggle-ai/barkdown/explorer.css";

import {
  BarkdownExplorer,
  type BarkdownDataset,
  type BarkdownRangeResult,
  type BarkdownSource,
} from "@raggle-ai/barkdown/explorer";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const root = document.getElementById("app");

if (!root) {
  throw new Error("Missing #app root");
}

document.body.style.margin = "0";
document.body.style.background = "#f7f7f8";
document.body.style.color = "#222";
document.body.style.fontFamily =
  'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/** Documents above this size load their first lines first, then the rest. */
const HEAD_BYTES = 128 * 1024;

const folder = new URLSearchParams(window.location.search).get("path");

async function api<T>(
  route: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<T> {
  const search = new URLSearchParams(params);
  if (folder) search.set("root", folder);
  const response = await fetch(`${route}?${search}`, {
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error("Could not load preview files.");
  }
  return response.json() as Promise<T>;
}

const source: BarkdownSource = {
  read: ({ signal } = {}) =>
    api<BarkdownDataset>(
      "/api/documents",
      { head: String(HEAD_BYTES) },
      signal,
    ),
  readRange: (path, range, { signal } = {}) =>
    api<BarkdownRangeResult>(
      "/api/document",
      {
        file: path,
        start: String(range.startLine),
        end: String(range.endLine),
      },
      signal,
    ),
};

createRoot(root).render(
  <StrictMode>
    <BarkdownExplorer brand="BarkDown" source={source} />
  </StrictMode>,
);
