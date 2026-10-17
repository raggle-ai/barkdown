import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { documentHead, readFolder, readRange } from "../dist/node.js";

test("readFolder reads Markdown, HTML, and text in path order", async () => {
  const root = await mkdtemp(join(tmpdir(), "barkdown-"));
  await mkdir(join(root, "guide"));
  await mkdir(join(root, "node_modules"));
  await writeFile(join(root, "README.md"), "# Read me");
  await writeFile(join(root, "guide", "notes.txt"), "Plain notes");
  await writeFile(join(root, "guide", "outline.markdown"), "# Outline");
  await writeFile(join(root, "guide", "page.html"), "<h1>Page</h1>");
  await writeFile(join(root, "guide", "ignored.js"), "alert(1)");
  await writeFile(join(root, "node_modules", "hidden.md"), "# Hidden");

  assert.deepEqual(await readFolder(root), {
    root,
    documents: [
      { path: "guide/notes.txt", content: "Plain notes", kind: "text" },
      {
        path: "guide/outline.markdown",
        content: "# Outline",
        kind: "markdown",
      },
      { path: "guide/page.html", content: "<h1>Page</h1>", kind: "html" },
      { path: "README.md", content: "# Read me", kind: "markdown" },
    ],
  });
});

test("readFolder lists large Markdown as a head with totals when headBytes is set", async () => {
  const root = await mkdtemp(join(tmpdir(), "barkdown-head-"));
  const sections = Array.from(
    { length: 40 },
    (_, index) => `## Section ${index + 1}\n\n${"text ".repeat(40)}\n`,
  );
  const long = `# Long\n\n${sections.join("\n")}`;
  await writeFile(join(root, "long.md"), long);
  await writeFile(join(root, "short.md"), "# Short\n");
  await writeFile(join(root, "page.html"), `<p>${"x".repeat(2000)}</p>`);

  const { documents } = await readFolder(root, { headBytes: 1200 });
  const longDocument = documents.find((item) => item.path === "long.md");
  const shortDocument = documents.find((item) => item.path === "short.md");
  const page = documents.find((item) => item.path === "page.html");

  assert.deepEqual(longDocument.partial, {
    lines: long.split("\n").length - 1,
    bytes: Buffer.byteLength(long),
  });
  assert.ok(Buffer.byteLength(longDocument.content) <= 1200);
  assert.ok(long.startsWith(longDocument.content));
  assert.match(
    long.slice(longDocument.content.length),
    /^## Section \d+/,
    "the remainder starts at a heading",
  );
  assert.equal(shortDocument.partial, undefined);
  assert.equal(page.partial, undefined, "HTML documents are never cut");
  assert.equal(page.content.length, 2007);
});

test("documentHead cuts at a line boundary when no heading falls in the second half", () => {
  const text = Array.from({ length: 50 }, (_, index) => `line ${index}`).join(
    "\n",
  );
  const head = documentHead(text, 100);
  assert.ok(text.startsWith(head.content));
  assert.ok(head.content.endsWith("\n"));
  assert.ok(Buffer.byteLength(head.content) <= 100);
  assert.deepEqual(head.partial, { lines: 50, bytes: Buffer.byteLength(text) });
});

test("readRange returns inclusive line ranges and clamps at the end of the file", async () => {
  const root = await mkdtemp(join(tmpdir(), "barkdown-range-"));
  await mkdir(join(root, "notes"));
  await writeFile(join(root, "notes", "a.md"), "one\ntwo\nthree\nfour\n");

  assert.deepEqual(
    await readRange(root, "notes/a.md", { startLine: 2, endLine: 3 }),
    {
      content: "two\nthree\n",
      startLine: 2,
      endLine: 3,
      totalLines: 4,
    },
  );
  assert.deepEqual(
    await readRange(root, "notes/a.md", { startLine: 4, endLine: 99 }),
    {
      content: "four\n",
      startLine: 4,
      endLine: 4,
      totalLines: 4,
    },
  );
  assert.deepEqual(
    await readRange(root, "notes/a.md", { startLine: 5, endLine: 9 }),
    {
      content: "",
      startLine: 5,
      endLine: 4,
      totalLines: 4,
    },
  );
  await assert.rejects(
    readRange(root, "../outside.md", { startLine: 1, endLine: 1 }),
    /outside/,
  );
});
