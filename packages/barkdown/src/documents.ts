export type BarkdownKind = "markdown" | "html" | "text";

export const extensions = new Set([
  ".htm",
  ".html",
  ".markdown",
  ".md",
  ".text",
  ".txt",
]);

export function documentKind(path: string): BarkdownKind | undefined {
  const extension = path.slice(path.lastIndexOf(".")).toLowerCase();
  if (extension === ".htm" || extension === ".html") return "html";
  if (extension === ".md" || extension === ".markdown") return "markdown";
  if (extension === ".text" || extension === ".txt") return "text";
  return undefined;
}

export function documentMatches(
  document: { path: string; content: string },
  query: string,
) {
  const value = query.trim().toLowerCase();
  if (!value) return true;
  return `${document.path}\n${document.content}`.toLowerCase().includes(value);
}

export function documentPath(search: string) {
  return new URLSearchParams(search).get("document");
}

export function documentUrl(current: string, path: string) {
  const url = new URL(current);
  url.searchParams.set("document", path);
  return url;
}
