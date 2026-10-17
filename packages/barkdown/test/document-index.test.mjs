import assert from "node:assert/strict";
import test from "node:test";

import {
  cachedDocumentIndex,
  documentHash,
  headingAtLine,
  headingById,
  indexDocument,
  outlineTree,
  sectionAtLine,
  sliceLines,
  utf8Length,
} from "../dist/document-index.js";
import { BoundedCache } from "../dist/bounded-cache.js";

const transcript = [
  "---",
  "title: Council meeting",
  "date: 2025-11-24",
  "---",
  "",
  "# Transcript",
  "",
  "Intro with a [link][minutes] and a note.[^1]",
  "",
  "## Segment 1: Budget",
  "",
  "**Chair** `09:31`",
  "Opening remarks.",
  "",
  "### Questions",
  "",
  "```md",
  "# not a heading inside a fence",
  "```",
  "",
  "    # not a heading in indented code",
  "",
  "> ## quoted heading stays out of the outline",
  "",
  "## Segment 2: Παραλία",
  "",
  "Setext heading",
  "---",
  "",
  "### Questions",
  "",
  "<div>",
  "## inside an html block",
  "</div>",
  "",
  "[minutes]: https://example.com/minutes",
  "",
  "[^1]: A footnote",
  "    with a continuation line.",
  "",
].join("\n");

test("indexDocument records headings with stable ids, lines, and offsets", () => {
  const index = indexDocument(transcript);

  assert.equal(index.title, "Council meeting");
  assert.deepEqual(
    index.headings.map((heading) => [
      heading.level,
      heading.text,
      heading.line,
      heading.id,
    ]),
    [
      [1, "Transcript", 6, "transcript"],
      [2, "Segment 1: Budget", 10, "segment-1-budget"],
      [3, "Questions", 15, "questions"],
      [2, "Segment 2: Παραλία", 25, "segment-2-παραλία"],
      [2, "Setext heading", 27, "setext-heading"],
      [3, "Questions", 30, "questions-1"],
    ],
  );
  for (const heading of index.headings) {
    const line = transcript.slice(heading.offset).split("\n")[0];
    assert.ok(
      line.includes(heading.text.split(":")[0]),
      `offset ${heading.offset} points at the heading line for ${heading.text}`,
    );
    assert.equal(
      utf8Length(transcript.slice(0, heading.offset)),
      heading.byteOffset,
    );
  }
  assert.deepEqual(
    index.headings.map((heading) => heading.parent),
    [undefined, 0, 1, 0, 0, 4],
  );
});

test("indexDocument measures lines, bytes, chars, and frontmatter", () => {
  const index = indexDocument(transcript);

  assert.equal(index.lines, transcript.split("\n").length - 1);
  assert.equal(index.bytes, Buffer.byteLength(transcript));
  assert.equal(index.chars, transcript.length);
  assert.deepEqual(
    index.frontmatter && [
      index.frontmatter.startLine,
      index.frontmatter.endLine,
    ],
    [1, 4],
  );
  assert.equal(
    index.frontmatter.text,
    "title: Council meeting\ndate: 2025-11-24",
  );
  assert.equal(index.body.startLine, 5);
  assert.equal(
    transcript.slice(index.body.start, index.body.start + 13),
    "\n# Transcript",
  );
  assert.equal(index.lineOffsets.length, index.lines);
  assert.equal(
    transcript.slice(index.lineOffsets[5], index.lineOffsets[6]),
    "# Transcript\n",
  );
});

test("indexDocument collects link and footnote definitions for section rendering", () => {
  const index = indexDocument(transcript);

  assert.deepEqual(index.definitions, [
    "[minutes]: https://example.com/minutes",
    "[^1]: A footnote",
    "    with a continuation line.",
  ]);
});

test("sections cover the body exactly once and split at structural headings", () => {
  const index = indexDocument(transcript);
  const body = transcript.slice(index.body.start);

  assert.equal(
    index.sections
      .map((section) => transcript.slice(section.start, section.end))
      .join(""),
    body,
  );
  assert.deepEqual(
    index.sections.map((section) => [
      section.level,
      section.startLine,
      section.endLine,
    ]),
    [
      [0, 5, 5],
      [1, 6, 9],
      [2, 10, 14],
      [3, 15, 24],
      [2, 25, 26],
      [2, 27, 29],
      [3, 30, 39],
    ],
  );
  assert.equal(sectionAtLine(index, 12).heading.text, "Segment 1: Budget");
  assert.equal(sectionAtLine(index, 5).level, 0);
  assert.equal(sectionAtLine(index, 39).heading.id, "questions-1");
  assert.equal(headingAtLine(index, 24).id, "questions");
  assert.equal(headingAtLine(index, 1), undefined);
  assert.equal(headingById(index, "setext-heading").line, 27);
});

test("sliceLines returns inclusive line ranges", () => {
  const text = "one\ntwo\nthree\nfour";
  const index = indexDocument(text);

  assert.equal(index.lines, 4);
  assert.equal(sliceLines(text, index, 2, 3), "two\nthree\n");
  assert.equal(sliceLines(text, index, 4, 4), "four");
  assert.equal(sliceLines(text, index, 1, 9), text);
});

test("outlineTree nests headings under their parents", () => {
  const index = indexDocument(transcript);
  const tree = outlineTree(index.headings);

  assert.equal(tree.length, 1);
  assert.deepEqual(
    tree[0].children.map((node) => node.heading.text),
    ["Segment 1: Budget", "Segment 2: Παραλία", "Setext heading"],
  );
  assert.deepEqual(
    tree[0].children[0].children.map((node) => node.heading.text),
    ["Questions"],
  );
});

test("indexDocument handles documents without headings, frontmatter, or trailing newline", () => {
  const plain = indexDocument("just text\nmore text");
  assert.equal(plain.title, undefined);
  assert.equal(plain.lines, 2);
  assert.deepEqual(
    plain.sections.map((section) => [
      section.level,
      section.start,
      section.end,
    ]),
    [[0, 0, 19]],
  );

  const empty = indexDocument("");
  assert.equal(empty.lines, 0);
  assert.equal(empty.bytes, 0);
  assert.deepEqual(empty.sections, []);

  const unterminated = indexDocument("---\ntitle: x");
  assert.equal(
    unterminated.frontmatter,
    undefined,
    "an unterminated fence is not frontmatter",
  );
});

test("indexDocument keeps setext underlines apart from thematic breaks and tables", () => {
  const index = indexDocument(
    [
      "# Top",
      "",
      "- item",
      "---",
      "",
      "| a |",
      "---",
      "",
      "> quote",
      "---",
      "",
      "Real heading",
      "===",
      "",
      "# Title with closing hashes ##",
      "#hashtag",
      "####### seven",
    ].join("\n"),
  );

  assert.deepEqual(
    index.headings.map((heading) => [heading.level, heading.text]),
    [
      [1, "Top"],
      [1, "Real heading"],
      [1, "Title with closing hashes"],
    ],
  );
});

test("indexDocument treats html blocks and script blocks as opaque", () => {
  const index = indexDocument(
    [
      "<script>",
      "# code",
      "</script>",
      "",
      "<details>",
      "<summary>More</summary>",
      "# still html",
      "</details>",
      "",
      "# After",
      "",
      "<!-- # comment -->",
      "",
      "<pre>",
      "# pre",
      "</pre>",
      "## Last",
    ].join("\n"),
  );

  assert.deepEqual(
    index.headings.map((heading) => heading.text),
    ["After", "Last"],
  );
});

test("cachedDocumentIndex reuses the index for identical content and honours invalidation", () => {
  const cache = new BoundedCache({
    maxEntries: 2,
    size: (index) => index.chars,
  });
  const first = cachedDocumentIndex("# A\n\ntext", { cache });
  const again = cachedDocumentIndex("# A\n\ntext", { cache });
  assert.equal(first, again);

  const other = cachedDocumentIndex("# B\n\ntext", { cache });
  assert.notEqual(other, first);
  assert.equal(cache.size, 2);

  cachedDocumentIndex("# C", { cache });
  assert.equal(cache.size, 2, "the oldest index is evicted");
  assert.notEqual(cachedDocumentIndex("# A\n\ntext", { cache }), first);

  const keyed = cachedDocumentIndex("# Keyed", { cache, key: "notes.md@1" });
  assert.equal(
    cachedDocumentIndex("# Keyed", { cache, key: "notes.md@1" }),
    keyed,
  );
  assert.equal(
    cache.invalidate((key) => key.startsWith("notes.md@")),
    1,
  );
  assert.notEqual(
    cachedDocumentIndex("# Keyed", { cache, key: "notes.md@1" }),
    keyed,
  );
});

test("documentHash is stable and distinguishes content", () => {
  assert.equal(documentHash("abc"), documentHash("abc"));
  assert.notEqual(documentHash("abc"), documentHash("abd"));
  assert.match(documentHash("abc"), /^[0-9a-f]{16}$/);
});
