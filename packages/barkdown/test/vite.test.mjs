import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { barkdownPlugin } from "../dist/vite.js";

test("barkdownPlugin reads the folder in root and path queries", async () => {
  const root = mkdtempSync(join(tmpdir(), "barkdown-vite-"));
  const selected = join(root, "selected");
  mkdirSync(selected);
  writeFileSync(join(selected, "README.md"), "# Selected\n");

  const watched = [];
  let middleware;
  barkdownPlugin(root).configureServer({
    watcher: {
      add(path) {
        watched.push(path);
      },
      on() {},
    },
    ws: { send() {} },
    middlewares: {
      use(handler) {
        middleware = handler;
      },
    },
  });

  for (const query of [
    `root=${encodeURIComponent(selected)}`,
    `path=${encodeURIComponent(selected)}`,
  ]) {
    let status;
    let body = "";
    await middleware(
      { url: `/api/documents?${query}` },
      {
        writeHead(value) {
          status = value;
        },
        end(value) {
          body = value;
        },
      },
      () => assert.fail("The API middleware called next"),
    );

    assert.equal(status, 200);
    assert.deepEqual(JSON.parse(body), {
      root: selected,
      documents: [
        { path: "README.md", content: "# Selected\n", kind: "markdown" },
      ],
    });
  }
  assert.ok(watched.some((path) => path.startsWith(selected)));
});

test("barkdownPlugin serves document heads and line ranges", async () => {
  const root = mkdtempSync(join(tmpdir(), "barkdown-vite-range-"));
  const long = `# Long\n\n${Array.from({ length: 30 }, (_, index) => `## Part ${index}\n\n${"word ".repeat(30)}\n`).join("\n")}`;
  writeFileSync(join(root, "long.md"), long);

  let middleware;
  barkdownPlugin(root).configureServer({
    watcher: { add() {}, on() {} },
    ws: { send() {} },
    middlewares: {
      use(handler) {
        middleware = handler;
      },
    },
  });
  const call = async (url) => {
    let status;
    let body = "";
    await middleware(
      { url },
      {
        writeHead(value) {
          status = value;
        },
        end(value) {
          body = value;
        },
      },
      () => assert.fail("The API middleware called next"),
    );
    return { status, body: JSON.parse(body) };
  };

  const listing = await call(
    `/api/documents?root=${encodeURIComponent(root)}&head=600`,
  );
  assert.equal(listing.status, 200);
  const [document] = listing.body.documents;
  assert.equal(document.partial.lines, long.split("\n").length - 1);
  assert.ok(Buffer.byteLength(document.content) <= 600);

  const range = await call(
    `/api/document?root=${encodeURIComponent(root)}&file=long.md&start=2&end=4`,
  );
  assert.equal(range.status, 200);
  assert.deepEqual(range.body, {
    content: "\n## Part 0\n\n",
    startLine: 2,
    endLine: 4,
    totalLines: long.split("\n").length - 1,
  });

  const missing = await call(
    `/api/document?root=${encodeURIComponent(root)}&file=nope.md&start=1&end=2`,
  );
  assert.equal(missing.status, 500);
  assert.match(missing.body.error, /ENOENT|no such file/i);

  let passed = false;
  await middleware({ url: "/api/other" }, {}, () => {
    passed = true;
  });
  assert.equal(passed, true, "unrelated routes fall through");
});
