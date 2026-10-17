import assert from "node:assert/strict";
import test from "node:test";

import { JSDOM } from "jsdom";

// Set up a DOM before importing react-dom so client rendering works.
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://barkdown.test/docs/transcript.md",
  pretendToBeVisual: true,
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Document = dom.window.Document;
globalThis.Node = dom.window.Node;
globalThis.Event = dom.window.Event;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame;
// Real timers drive the progressive scheduler, so this file does not use act().
globalThis.IS_REACT_ACT_ENVIRONMENT = false;
dom.window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {
  this.dataset.scrolled = "true";
};

const { createElement } = await import("react");
const { flushSync } = await import("react-dom");
const { createRoot } = await import("react-dom/client");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test.after(() => dom.window.close());
const { BarkdownMarkdown, chunkDocument, indexDocument } =
  await import("../dist/index.js");

/** A document with many short sections so chunking is visible. */
function sampleDocument(sections = 12) {
  const lines = [
    "---",
    "title: Sample",
    "---",
    "",
    "# Sample",
    "",
    "Intro with [ref][docs].",
  ];
  for (let index = 1; index <= sections; index += 1) {
    lines.push(
      "",
      `## Section ${index}`,
      "",
      `Paragraph ${index} with \`code\`.`,
    );
    if (index % 4 === 0) {
      lines.push("", "```js", `const value = ${index};`, "```");
    }
    lines.push("", `### Detail ${index}`, "", `Detail text ${index}.`);
  }
  lines.push("", "[docs]: https://example.com/docs", "");
  return lines.join("\n");
}

const policy = {
  bytes: 100,
  lines: 10,
  chunkBytes: 120,
  initialChunks: 1,
  sliceMs: 16,
};

/** Renders synchronously, so assertions can run before any timer fires. */
function render(props) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(createElement(BarkdownMarkdown, props));
  });
  return {
    container,
    async unmount() {
      flushSync(() => root.unmount());
      container.remove();
      await sleep(0);
    },
  };
}

async function settle(container, timeout = 5000) {
  const started = Date.now();
  while (container.querySelector("[data-barkdown-chunk-pending]")) {
    if (Date.now() - started > timeout)
      throw new Error("progressive render did not finish");
    await sleep(5);
  }
  await sleep(5);
}

test("chunkDocument merges sections up to the byte budget and keeps nesting when asked", () => {
  const text = sampleDocument(6);
  const index = indexDocument(text);
  const body = text.slice(index.body.start);

  const fine = chunkDocument(index, {
    valueStart: index.body.start,
    chunkBytes: 1,
    keepNesting: false,
  });
  assert.equal(
    fine.length,
    index.sections.length,
    "every section is its own chunk at a tiny budget",
  );
  assert.equal(
    fine.map((chunk) => body.slice(chunk.start, chunk.end)).join(""),
    body,
  );
  assert.equal(fine[0].startLine, index.body.startLine);
  assert.equal(fine.at(-1).endLine, index.lines);

  const nested = chunkDocument(index, {
    valueStart: index.body.start,
    chunkBytes: 1,
    keepNesting: true,
  });
  for (const chunk of nested) {
    const [first, ...rest] = chunk.headings;
    if (first?.level === 2) {
      assert.ok(
        rest.every(
          (heading) =>
            heading.level > 2 ||
            (heading.level <= 2 && rest.indexOf(heading) === -1),
        ),
        "a level-2 chunk closes before the next level-2 heading",
      );
    }
  }
  assert.ok(
    nested.some((chunk) =>
      chunk.headings.some((heading) => heading.level === 3),
    ),
    "level-3 headings stay inside their level-2 chunk",
  );

  const whole = chunkDocument(index, {
    valueStart: 0,
    chunkBytes: 1_000_000,
    keepNesting: false,
  });
  assert.equal(whole.length, 1);
  assert.equal(
    text.slice(whole[0].start, whole[0].end),
    text,
    "frontmatter joins the first chunk",
  );
});

test("a large document renders the first chunk at once and the rest progressively", async (t) => {
  const text = sampleDocument(12);
  const index = indexDocument(text);
  const progress = [];
  const { container, unmount } = render({
    value: text.slice(index.body.start),
    index,
    firstLine: index.body.startLine,
    largeDocument: policy,
    onRenderProgress: (state) => progress.push(state),
  });
  t.after(unmount);

  const root = container.querySelector("[data-barkdown-progressive]");
  assert.ok(root, "progressive container is marked");
  const pending = container.querySelectorAll("[data-barkdown-chunk-pending]");
  assert.ok(pending.length > 0, "later chunks start as placeholders");
  assert.equal(
    container.querySelectorAll(
      "[data-barkdown-chunk]:not([data-barkdown-chunk-pending])",
    ).length,
    1,
  );

  // Placeholders carry their headings and IDs so links resolve immediately.
  const placeholderHeading = pending[0].querySelector("h2, h3");
  assert.ok(placeholderHeading);
  assert.ok(
    index.headings.some((heading) => heading.id === placeholderHeading.id),
  );
  assert.equal(pending[0].getAttribute("aria-busy"), "true");

  await settle(container);

  assert.equal(
    container.querySelectorAll("[data-barkdown-chunk-pending]").length,
    0,
  );
  assert.ok(progress.at(-1).done);
  assert.equal(progress.at(-1).rendered, progress.at(-1).total);
  assert.ok(progress.length > 1, "progress is reported per slice");

  // Every indexed heading is rendered exactly once with its index ID and line.
  for (const heading of index.headings) {
    const elements = container.querySelectorAll(`#${heading.id}`);
    assert.equal(elements.length, 1, `${heading.id} rendered once`);
    assert.equal(elements[0].dataset.barkdownLine, String(heading.line));
    assert.equal(elements[0].tabIndex, -1);
  }
  // Reference links defined in the last chunk resolve in the first chunk.
  assert.ok(container.querySelector('a[href="https://example.com/docs"]'));
  // Without rehype-highlight in the pipeline, code blocks highlight
  // themselves (immediately here, since jsdom has no IntersectionObserver).
  const code = container.querySelector("pre code.language-js");
  assert.ok(code);
  assert.ok(code.classList.contains("hljs"));
  assert.ok(container.querySelectorAll(".hljs-keyword").length > 0);
});

test("a deep link brings its chunk forward and focuses the heading", async (t) => {
  const text = sampleDocument(40);
  const index = indexDocument(text);
  const target = index.headings.find((heading) => heading.text === "Detail 39");
  window.location.hash = `#${target.id}`;
  // sliceMs 0 pins the scheduler to one chunk per slice.
  const { container, unmount } = render({
    value: text.slice(index.body.start),
    index,
    firstLine: index.body.startLine,
    largeDocument: { ...policy, sliceMs: 0 },
  });
  t.after(async () => {
    window.location.hash = "";
    await unmount();
  });

  const placeholder = container
    .querySelector(`#${target.id}`)
    .closest("[data-barkdown-chunk-pending]");
  assert.ok(placeholder, "the target starts as a placeholder heading");
  const targetChunk = Number(placeholder.dataset.barkdownChunk);
  assert.ok(targetChunk > 1);

  // Record the order in which placeholders turn into rendered chunks.
  const order = [];
  const observer = new dom.window.MutationObserver((records) => {
    for (const record of records) {
      if (!record.target.hasAttribute("data-barkdown-chunk-pending")) {
        order.push(Number(record.target.dataset.barkdownChunk));
      }
    }
  });
  observer.observe(container, {
    attributes: true,
    attributeFilter: ["data-barkdown-chunk-pending"],
    subtree: true,
  });
  await settle(container);
  observer.disconnect();

  assert.equal(
    order[0],
    targetChunk,
    "the deep-link chunk rendered ahead of the queue",
  );
  assert.deepEqual(
    order.slice(1),
    order.slice(1).toSorted((a, b) => a - b),
    "the remaining chunks rendered in document order",
  );
  const heading = container.querySelector(`#${target.id}`);
  assert.equal(heading.dataset.scrolled, "true");
  assert.equal(document.activeElement, heading);
});

test("small documents keep the one-pass renderer and still get heading ids and lines", async (t) => {
  const text = "# Title\n\nText\n\n## Part\n\nMore";
  const progress = [];
  const { container, unmount } = render({
    value: text,
    onRenderProgress: (state) => progress.push(state),
  });
  t.after(unmount);
  await sleep(0);

  assert.equal(container.querySelector("[data-barkdown-progressive]"), null);
  assert.equal(container.querySelector("[data-barkdown-chunk]"), null);
  assert.equal(container.querySelector("h2").id, "part");
  assert.equal(container.querySelector("h2").dataset.barkdownLine, "5");
  assert.deepEqual(progress, [{ rendered: 1, total: 1, done: true }]);
});

test("firstLine shifts heading lines when rendering a slice of a document", async (t) => {
  const text = "---\ntitle: x\n---\n\n# Title\n\n## Part";
  const index = indexDocument(text);
  const { container, unmount } = render({
    value: text.slice(index.body.start),
    index,
    firstLine: index.body.startLine,
    largeDocument: false,
  });
  t.after(unmount);

  assert.equal(container.querySelector("h1").dataset.barkdownLine, "5");
  assert.equal(container.querySelector("h2").dataset.barkdownLine, "7");
  assert.equal(
    container.querySelector("hr"),
    null,
    "frontmatter is not rendered",
  );
});

test("documents above the plain-text threshold render as numbered source lines", async (t) => {
  const text = sampleDocument(3);
  const { container, unmount } = render({
    value: text,
    largeDocument: { plainTextBytes: 10 },
  });
  t.after(unmount);

  const pre = container.querySelector("[data-barkdown-plain-text]");
  assert.ok(pre);
  assert.equal(container.querySelectorAll("h1").length, 0);
  assert.equal(pre.querySelector("#L5").textContent.trim(), "5# Sample");
  assert.equal(
    pre.querySelectorAll("[data-barkdown-line]").length,
    text.split("\n").length - 1,
  );
});
