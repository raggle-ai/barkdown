/**
 * Syntax highlighting on demand for progressive rendering. The Markdown
 * pipeline skips `rehype-highlight` for large documents; code blocks highlight
 * themselves when they come near the viewport, with the same highlight.js
 * grammars (`common`) and the same `hljs` class names, so the stylesheet
 * applies unchanged. Results are cached by language and content.
 */
import type { HLJSApi } from "highlight.js";

import { BoundedCache } from "./bounded-cache.js";
import { documentHash } from "./document-index.js";

let loader: Promise<HLJSApi> | undefined;

export function loadHighlighter(): Promise<HLJSApi> {
  loader ??= import("highlight.js/lib/common").then((module) => module.default);
  return loader;
}

/** Highlighted HTML by language and code hash. */
export const highlightCache = new BoundedCache<string, string>({
  maxEntries: 500,
  maxBytes: 8 * 1024 * 1024,
  size: (html) => html.length,
});

/**
 * HTML for a code block, or `undefined` when the language is not registered.
 * The output only contains `<span class="hljs-…">` wrappers around escaped
 * text, which is what `rehype-highlight` produces in the standard pipeline.
 */
export async function highlightCode(
  code: string,
  language: string,
): Promise<string | undefined> {
  const key = `${language}:${code.length}:${documentHash(code)}`;
  const cached = highlightCache.get(key);
  if (cached !== undefined) return cached;
  const hljs = await loadHighlighter();
  if (!hljs.getLanguage(language)) return undefined;
  const html = hljs.highlight(code, { language, ignoreIllegals: true }).value;
  highlightCache.set(key, html);
  return html;
}
