import assert from "node:assert/strict";
import test from "node:test";

import { JSDOM } from "jsdom";

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
globalThis.KeyboardEvent = dom.window.KeyboardEvent;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame;
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame;
globalThis.IS_REACT_ACT_ENVIRONMENT = false;
dom.window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {
  this.dataset.scrolled = "true";
};

const { createElement } = await import("react");
const { flushSync } = await import("react-dom");
const { createRoot } = await import("react-dom/client");
const {
  BarkdownOutline,
  BarkdownReader,
  createLoadState,
  advanceLoadState,
  indexDocument,
} = await import("../dist/index.js");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test.after(() => dom.window.close());

const sample = [
  "---",
  "title: Council meeting",
  "---",
  "",
  "# Council meeting",
  "",
  "Intro paragraph.",
  "",
  "## Segment 1",
  "",
  "Segment one text.",
  "",
  "### Detail 1",
  "",
  "Detail one.",
  "",
  "## Segment 2",
  "",
  "Segment two text.",
  "",
  "### Detail 2",
  "",
  "Detail two.",
  "",
].join("\n");

function render(element) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => root.render(element));
  return {
    container,
    rerender(next) {
      flushSync(() => root.render(next));
    },
    async unmount() {
      await sleep(10);
      flushSync(() => root.unmount());
      container.remove();
    },
  };
}

/** Dispatches a click and waits for React to apply the resulting update. */
async function click(element) {
  element.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  await sleep(10);
}

/** Sets an input's value through React's change tracking. */
async function type(input, value) {
  const setter = Object.getOwnPropertyDescriptor(
    dom.window.HTMLInputElement.prototype,
    "value",
  ).set;
  setter.call(input, value);
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  await sleep(10);
}

test("BarkdownOutline nests headings, marks the active one, and filters by search", async (t) => {
  const index = indexDocument(sample);
  const { container, rerender, unmount } = render(
    createElement(BarkdownOutline, {
      headings: index.headings,
      activeId: "detail-1",
    }),
  );
  t.after(unmount);

  const nav = container.querySelector("nav[aria-label='Document outline']");
  assert.ok(nav);
  const top = nav.querySelector(":scope > ol > li > a");
  assert.equal(top.textContent, "Council meeting");
  assert.equal(top.getAttribute("href"), "#council-meeting");
  assert.deepEqual(
    [...nav.querySelectorAll(":scope > ol > li > ol > li > a")].map(
      (link) => link.textContent,
    ),
    ["Segment 1", "Segment 2"],
  );
  assert.equal(
    nav.querySelector("a[aria-current='location']").textContent,
    "Detail 1",
  );
  assert.equal(
    nav.querySelector("a[aria-current='location']").dataset.scrolled,
    "true",
  );

  const input = nav.querySelector("input[type='search']");
  assert.equal(input.getAttribute("placeholder"), "Search headings");
  await type(input, "detail");
  assert.deepEqual(
    [...nav.querySelectorAll("[data-barkdown-outline-results] a")].map(
      (link) => link.textContent,
    ),
    ["Detail 1", "Detail 2"],
  );

  await type(input, "nothing here");
  assert.equal(
    nav.querySelector("[data-barkdown-outline-empty]").textContent,
    "No headings match.",
  );

  await type(input, "");
  rerender(
    createElement(BarkdownOutline, {
      headings: index.headings,
      maxLevel: 2,
      search: false,
    }),
  );
  assert.equal(container.querySelector("input"), null);
  assert.equal(
    container.querySelectorAll("a").length,
    3,
    "level 3 headings are hidden",
  );
});

test("BarkdownReader strips frontmatter, offers the outline, and switches views", async (t) => {
  const views = [];
  const { container, unmount } = render(
    createElement(BarkdownReader, {
      value: sample,
      defaultOutlineOpen: true,
      onViewChange: (view) => views.push(view),
    }),
  );
  t.after(unmount);

  const reader = container.querySelector("[data-barkdown-reader]");
  assert.equal(reader.dataset.barkdownReaderView, "rendered");
  assert.equal(reader.dataset.barkdownReaderOutline, "open");
  assert.equal(
    container.querySelector("hr"),
    null,
    "frontmatter is not rendered",
  );
  assert.equal(container.querySelector("h1").id, "council-meeting");
  assert.equal(container.querySelector("h1").dataset.barkdownLine, "5");

  const toolbar = container.querySelector(
    "[role='toolbar'][aria-label='Reading controls']",
  );
  assert.ok(toolbar);
  for (const label of [
    "Hide outline",
    "Previous heading",
    "Next heading",
    "View source",
  ]) {
    assert.ok(
      toolbar.querySelector(`button[aria-label='${label}']`),
      `${label} button`,
    );
  }
  assert.equal(
    toolbar.querySelector("[aria-label='Previous heading']").disabled,
    true,
  );
  assert.equal(
    toolbar
      .querySelector("[aria-label='Next heading']")
      .getAttribute("aria-keyshortcuts"),
    "Alt+ArrowDown",
  );

  const outlineToggle = toolbar.querySelector(
    "button[aria-label='Hide outline']",
  );
  const panel = container.querySelector("[data-barkdown-reader-outline-panel]");
  assert.equal(outlineToggle.getAttribute("aria-controls"), panel.id);
  assert.ok(panel.querySelector("nav a[href='#segment-2']"));
  await click(outlineToggle);
  assert.equal(
    container.querySelector("[data-barkdown-reader-outline-panel]"),
    null,
  );
  assert.equal(
    toolbar
      .querySelector("button[aria-label='Show outline']")
      .getAttribute("aria-expanded"),
    "false",
  );

  const viewToggle = toolbar.querySelector("button[aria-label='View source']");
  assert.equal(viewToggle.getAttribute("aria-pressed"), "false");
  await click(viewToggle);
  assert.equal(viewToggle.getAttribute("aria-pressed"), "true");
  assert.equal(reader.dataset.barkdownReaderView, "source");
  const pre = container.querySelector("[data-barkdown-plain-text]");
  assert.ok(pre);
  assert.equal(
    pre.querySelector("#L5").textContent.trim(),
    "5# Council meeting",
  );
  assert.equal(container.querySelector("h1"), null);
  await click(viewToggle);
  assert.ok(container.querySelector("h1"));
  assert.deepEqual(views, ["source", "rendered"]);
});

test("BarkdownReader steps to the next heading and focuses it", async (t) => {
  window.location.hash = "";
  const { container, unmount } = render(
    createElement(BarkdownReader, { value: sample }),
  );
  t.after(async () => {
    window.location.hash = "";
    await unmount();
  });

  await click(container.querySelector("button[aria-label='Next heading']"));
  await sleep(20);
  assert.equal(window.location.hash, "#council-meeting");
  const heading = container.querySelector("#council-meeting");
  assert.equal(heading.dataset.scrolled, "true");
  assert.equal(document.activeElement, heading);
});

test("BarkdownReader collapses and expands every section", async (t) => {
  const { container, unmount } = render(
    createElement(BarkdownReader, { value: sample, collapsibleHeadings: true }),
  );
  t.after(unmount);

  const toggles = () => [
    ...container.querySelectorAll(".barkdown-heading-toggle"),
  ];
  assert.ok(toggles().length >= 5);
  assert.ok(
    toggles().every(
      (button) => button.getAttribute("aria-expanded") === "true",
    ),
  );

  await click(
    container.querySelector("button[aria-label='Collapse all sections']"),
  );
  assert.ok(
    toggles().every(
      (button) => button.getAttribute("aria-expanded") === "false",
    ),
  );
  assert.ok(
    [...container.querySelectorAll(".barkdown-section-content")].every(
      (content) => content.hidden,
    ),
  );

  await click(
    container.querySelector("button[aria-label='Expand all sections']"),
  );
  assert.ok(
    toggles().every(
      (button) => button.getAttribute("aria-expanded") === "true",
    ),
  );
});

test("BarkdownReader shows host load phases with progress and elapsed time", async (t) => {
  let loading = advanceLoadState(
    createLoadState("listing", 1000),
    { phase: "reading", progress: 0.4, detail: "4,000 / 10,000 lines" },
    1800,
  );
  const { container, rerender, unmount } = render(
    createElement(BarkdownReader, { value: sample, loading }),
  );
  t.after(unmount);

  const status = container.querySelector("[data-barkdown-reader-status]");
  assert.ok(status);
  assert.equal(status.querySelector("[role='status']").textContent, "Reading");
  assert.equal(status.querySelector("progress").value, 0.4);
  assert.match(status.textContent, /4,000 \/ 10,000 lines/);
  assert.match(status.textContent, /0\.8 s/);

  loading = advanceLoadState(loading, { phase: "ready", progress: 1 }, 2000);
  rerender(createElement(BarkdownReader, { value: sample, loading }));
  await sleep(10);
  assert.equal(container.querySelector("[data-barkdown-reader-status]"), null);
});

test("BarkdownReader defaults to the source view above the plain-text threshold", async (t) => {
  const { container, unmount } = render(
    createElement(BarkdownReader, {
      value: sample,
      largeDocument: { plainTextBytes: 10 },
    }),
  );
  t.after(unmount);

  assert.equal(
    container.querySelector("[data-barkdown-reader]").dataset
      .barkdownReaderView,
    "source",
  );
  assert.ok(container.querySelector("[data-barkdown-plain-text]"));
  await click(container.querySelector("button[aria-label='View source']"));
  assert.ok(
    container.querySelector("h1"),
    "the reader can still render the document on request",
  );
});
