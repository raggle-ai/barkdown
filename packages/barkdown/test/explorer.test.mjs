import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { folderName, resolveEmbeddedHtmlPath } from "../dist/explorer.js";

test("folderName returns the active folder name", () => {
  assert.equal(folderName("/Users/example/clients/flutter/"), "flutter");
  assert.equal(folderName("C:\\Users\\example\\notes"), "notes");
});

test("BarkdownExplorer enables collapsible headings in the shared viewer", async () => {
  const bundle = await readFile(
    new URL("../dist/explorer.js", import.meta.url),
    "utf8",
  );
  assert.match(bundle, /collapsibleHeadings:\s*true/);
});

test("resolveEmbeddedHtmlPath resolves root and nested Markdown files", () => {
  assert.equal(
    resolveEmbeddedHtmlPath("report.md", "visualizations/ownership.html"),
    "visualizations/ownership.html",
  );
  assert.equal(
    resolveEmbeddedHtmlPath("notes/report.md", "charts/ownership.html"),
    "notes/charts/ownership.html",
  );
});
