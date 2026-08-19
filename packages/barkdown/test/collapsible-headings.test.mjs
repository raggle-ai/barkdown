import assert from "node:assert/strict";
import test from "node:test";

import { JSDOM } from "jsdom";

// Set up a DOM before importing react-dom so client rendering works.
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://barkdown.test/docs/guide.md",
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.Event = dom.window.Event;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { BarkdownMarkdown } = await import("../dist/index.js");

async function renderMarkdown(props) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(createElement(BarkdownMarkdown, props));
  });
  return {
    container,
    async unmount() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

async function click(element) {
  await act(async () => {
    element.click();
  });
}

test("selecting a heading button toggles aria-expanded and hides the section content", async (t) => {
  const { container, unmount } = await renderMarkdown({
    value: "## Account\n\nAccount text.",
    collapsibleHeadings: true,
  });
  t.after(unmount);

  const button = container.querySelector(".barkdown-heading-toggle");
  const content = container.querySelector(".barkdown-section-content");
  assert.ok(button, "toggle button exists");
  assert.equal(button.getAttribute("aria-expanded"), "true");
  assert.equal(content.hidden, false);

  await click(button);
  assert.equal(button.getAttribute("aria-expanded"), "false");
  assert.equal(content.hidden, true);
  assert.equal(button.getAttribute("aria-controls"), content.id);

  await click(button);
  assert.equal(button.getAttribute("aria-expanded"), "true");
  assert.equal(content.hidden, false);
});

test("the toggle is a real keyboard-operable button", async (t) => {
  const { container, unmount } = await renderMarkdown({
    value: "## Account\n\nAccount text.",
    collapsibleHeadings: true,
  });
  t.after(unmount);

  const button = container.querySelector(".barkdown-heading-toggle");
  // A native <button type="button"> inside the heading gives keyboard users
  // Tab focus and Enter/Space activation without custom key handling.
  assert.equal(button.tagName, "BUTTON");
  assert.equal(button.getAttribute("type"), "button");
  button.focus();
  assert.equal(document.activeElement, button);
});

test("a fragment opens its closed ancestor sections", async (t) => {
  const { container, unmount } = await renderMarkdown({
    value: [
      "## Account",
      "",
      "Account text.",
      "",
      "### Password",
      "",
      "Password text.",
    ].join("\n"),
    collapsibleHeadings: true,
  });
  t.after(unmount);

  const accountButton = container.querySelector(
    "#account .barkdown-heading-toggle",
  );
  const accountContent = container.querySelector("#account-content");

  // The reader closes the parent section, then follows a deep link.
  await click(accountButton);
  assert.equal(accountButton.getAttribute("aria-expanded"), "false");
  assert.equal(accountContent.hidden, true);

  window.location.hash = "#password";
  await act(async () => {
    window.dispatchEvent(new window.Event("hashchange"));
  });

  assert.equal(accountButton.getAttribute("aria-expanded"), "true");
  assert.equal(accountContent.hidden, false);

  window.location.hash = "";
});

test("closing a parent section hides nested child sections", async (t) => {
  const { container, unmount } = await renderMarkdown({
    value: [
      "## Account",
      "",
      "Account text.",
      "",
      "### Password",
      "",
      "Password text.",
    ].join("\n"),
    collapsibleHeadings: true,
  });
  t.after(unmount);

  const accountContent = container.querySelector("#account-content");
  const passwordSection = accountContent.querySelector(
    "[data-barkdown-section]",
  );
  assert.ok(passwordSection, "child section is nested inside the parent");

  await click(container.querySelector("#account .barkdown-heading-toggle"));
  assert.equal(accountContent.hidden, true);
  assert.equal(accountContent.contains(passwordSection), true);
});

test("custom heading components still render inside collapsible sections", async (t) => {
  const { container, unmount } = await renderMarkdown({
    value: "## Account\n\nAccount text.",
    collapsibleHeadings: true,
    components: {
      h2: (props) =>
        createElement("h2", { ...props, "data-custom-heading": "" }),
    },
  });
  t.after(unmount);

  const heading = container.querySelector("h2[data-custom-heading]");
  assert.ok(heading, "custom heading component rendered");
  assert.ok(
    heading.querySelector(".barkdown-heading-toggle"),
    "custom heading still contains the toggle button",
  );
});
