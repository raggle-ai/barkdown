import assert from "node:assert/strict";
import test from "node:test";

import { folderName, resolveEmbeddedHtmlPath } from "../dist/explorer.js";

test("folderName returns the active folder name", () => {
  assert.equal(folderName("/Users/example/clients/flutter/"), "flutter");
  assert.equal(folderName("C:\\Users\\example\\notes"), "notes");
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
