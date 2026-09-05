import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { chromium } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { BarkdownMarkdown } from "../../dist/index.js";

const fixture = await readFile(
  new URL("../fixtures/formatting.md", import.meta.url),
  "utf8",
);
const styles = (
  await readFile(new URL("../../styles.css", import.meta.url), "utf8")
).replace(/^@import .*;$/gm, "");
const markup = renderToStaticMarkup(
  createElement(BarkdownMarkdown, {
    copyCode: false,
    linkIcons: false,
    value: fixture,
  }),
);

test("Barkdown keeps rich Markdown readable after a consumer CSS reset", async (t) => {
  const browser = await chromium.launch({
    channel: "chromium",
    headless: true,
  });
  t.after(() => browser.close());

  const page = await browser.newPage({
    viewport: { width: 900, height: 1200 },
  });
  await page.setContent(
    `<!doctype html>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; color: rgb(31, 35, 40); font: 16px/1.5 sans-serif; }
        ul, ol { margin: 0; padding: 0; list-style: none; }
        a { color: inherit; text-decoration: none; }
        ${styles}
      </style>
      <main style="max-width: 760px; padding: 32px">${markup}</main>`,
    { waitUntil: "domcontentloaded" },
  );

  const root = page.locator("[data-barkdown]");
  await assert.doesNotReject(() => root.waitFor({ state: "visible" }));

  const style = (selector, properties) =>
    root
      .locator(selector)
      .first()
      .evaluate(
        (element, names) =>
          Object.fromEntries(
            names.map((name) => [name, getComputedStyle(element)[name]]),
          ),
        properties,
      );

  assert.equal(
    (await style("ul:not(.contains-task-list)", ["listStyleType"]))
      .listStyleType,
    "disc",
  );
  assert.equal(
    (await style("ul:not(.contains-task-list) ul", ["listStyleType"]))
      .listStyleType,
    "circle",
  );
  assert.equal(
    (await style("ul:not(.contains-task-list) ul ul", ["listStyleType"]))
      .listStyleType,
    "square",
  );
  assert.equal((await style("ol", ["listStyleType"])).listStyleType, "decimal");
  assert.equal(
    (await style("ol ol", ["listStyleType"])).listStyleType,
    "lower-alpha",
  );
  assert.equal(
    (await style("ol ol ol", ["listStyleType"])).listStyleType,
    "lower-roman",
  );
  assert.equal(
    (await style("ul.contains-task-list", ["listStyleType"])).listStyleType,
    "none",
  );

  const small = await style("small", ["color", "fontSize", "lineHeight"]);
  assert.equal(small.fontSize, "13px");
  assert.notEqual(small.color, "rgb(31, 35, 40)");
  assert.ok(
    Number.parseFloat(small.lineHeight) > Number.parseFloat(small.fontSize),
  );
  assert.equal((await style("small em", ["fontStyle"])).fontStyle, "italic");

  const blockquote = await style("blockquote", [
    "backgroundColor",
    "borderLeftStyle",
  ]);
  assert.equal(blockquote.borderLeftStyle, "solid");
  assert.notEqual(blockquote.backgroundColor, "rgba(0, 0, 0, 0)");

  assert.notEqual(
    (await style("p code", ["backgroundColor"])).backgroundColor,
    "rgba(0, 0, 0, 0)",
  );
  assert.equal((await style("pre", ["overflowX"])).overflowX, "auto");
  assert.equal((await style("table", ["display"])).display, "block");
  assert.equal((await style("hr", ["borderTopStyle"])).borderTopStyle, "solid");
  assert.equal((await style("img", ["display", "maxWidth"])).display, "block");
  assert.equal((await style("img", ["maxWidth"])).maxWidth, "100%");
  assert.equal(
    (await style("del", ["textDecorationLine"])).textDecorationLine,
    "line-through",
  );

  const link = root.locator("a").first();
  assert.equal((await style("a", ["color"])).color, "rgb(9, 105, 218)");
  await link.hover();
  await page.waitForTimeout(150);
  assert.equal((await style("a", ["color"])).color, "rgb(5, 80, 174)");
  await link.focus();
  const focus = await style("a", ["outlineStyle", "outlineWidth"]);
  assert.equal(focus.outlineStyle, "solid");
  assert.equal(focus.outlineWidth, "2px");
});
