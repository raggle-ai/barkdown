import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { chromium } from "@playwright/test";
import { build } from "esbuild";

const origin = "https://barkdown.test";
const screenshots = process.env.BARKDOWN_SCREENSHOT_DIR;
const packageRoot = new URL("../../", import.meta.url).pathname;
const examples = await Promise.all(
  ["test_mermaid.md", "test_mermaid_examples.md"].map((name) =>
    readFile(new URL(`../../../../examples/${name}`, import.meta.url), "utf8"),
  ),
);
const styles = (
  await readFile(new URL("../../styles.css", import.meta.url), "utf8")
).replace(/^@import .*;$/gm, "");
const bundle = await build({
  stdin: {
    contents: `
      export { createElement } from "react";
      export { createRoot } from "react-dom/client";
      export { BarkdownMarkdown } from "./dist/index.js";
      export { createApp, h, reactive, ref } from "vue";
      export { BarkdownMermaid } from "./dist/vitepress.js";
    `,
    resolveDir: packageRoot,
  },
  bundle: true,
  define: {
    "process.env.NODE_ENV": '"production"',
    __VUE_OPTIONS_API__: "true",
    __VUE_PROD_DEVTOOLS__: "false",
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false",
  },
  format: "iife",
  globalName: "barkdown",
  logLevel: "silent",
  write: false,
});
// The `:root.dark` rule matches the VitePress default theme.
const page = `<!doctype html>
  <meta charset="utf-8">
  <style>
    :root { color-scheme: light dark; }
    :root.dark { color-scheme: dark; }
    body { margin: 0; background: Canvas; color: CanvasText; font: 16px/1.5 sans-serif; }
    main { max-width: 960px; padding: 24px; }
    ${styles}
  </style>
  <main id="react"></main>
  <main id="vue"></main>
  <script src="/bundle.js"></script>`;

const flowchart = `flowchart LR
  draft["Draft"] --> review["Review"]
  review --> approved{"Approved?"}
  approved -->|Yes| publish["Publish"]`;
const titled = `flowchart LR
  accTitle: Release flow
  accDescr: Draft moves to release
  draft["Draft"] --> release["Release"]`;
const hostile = [
  `%%{init: {"securityLevel": "loose", "flowchart": {"htmlLabels": true}}}%%
flowchart LR
  a["<img src=x onerror=window.__xss=1>"] --> b["<script>window.__xss=2</script>"]
  b --> c["#lt;img src=x onerror=window.__xss=3#gt;"]
  click a "javascript:window.__xss=4"
  click b href "data:text/html,<script>window.__xss=5</script>"
  click c call alert(6)`,
  'flowchart LR\n  a["`**md** <svg onload=window.__xss=7>`"] --> b',
  `flowchart LR
  a["javascript:window.__xss=8"]
  b@{ img: "javascript:window.__xss=9", label: "image" }
  class a internal-link`,
  `---
title: "<img src=x onerror=window.__xss=10>"
config:
  securityLevel: loose
  htmlLabels: true
---
flowchart LR
  accTitle: <img src=x onerror=window.__xss=11>
  accDescr: </desc><script>window.__xss=12</script>
  a["<b onmouseover=window.__xss=13>hover</b>"] --> b`,
  `---
config:
  kanban:
    ticketBaseUrl: "javascript:window.__xss=14//#TICKET#"
---
kanban
  todo[Todo]
    t1[Task]@{ ticket: "MC-1", assigned: "<img src=x onerror=window.__xss=15>" }`,
  `C4Context
  Person(user, "User", "<script>window.__xss=16</script>", $link="javascript:window.__xss=17")`,
  `sequenceDiagram
  participant A as Alice
  link A: Dashboard @ javascript:window.__xss=18
  links A: {"Repo": "javascript:window.__xss=22"}
  A->>A: <img src=x onerror=window.__xss=19>`,
  `classDiagram
  class Animal
  click Animal href "javascript:window.__xss=20"`,
];
const invalid = `flowchart LR
  A --> B
  style A fill:red;}</style><img src=x onerror=window.__xss=21>`;

function fence(source) {
  return ["```mermaid", source, "```"].join("\n");
}

// Takes [red, green, blue] in the 0-255 range.
function luminance(color) {
  const channels = color.slice(0, 3).map((value) => {
    const channel = value / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(first, second) {
  const [light, dark] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  );
  return (light + 0.05) / (dark + 0.05);
}

test("Pele renders Mermaid fences in React and VitePress components", async (t) => {
  const browser = await chromium.launch({
    channel: "chromium",
    headless: true,
  });
  t.after(() => browser.close());

  const context = await browser.newContext({
    acceptDownloads: true,
    colorScheme: "light",
    viewport: { width: 1100, height: 900 },
  });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], {
    origin,
  });
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    return route.fulfill(
      url.pathname === "/bundle.js"
        ? { body: bundle.outputFiles[0].text, contentType: "text/javascript" }
        : { body: page, contentType: "text/html" },
    );
  });
  const tab = await context.newPage();
  const problems = [];
  tab.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      problems.push(message.text());
    }
  });
  tab.on("pageerror", (error) => problems.push(error.message));
  tab.on("dialog", (dialog) => {
    problems.push(`dialog: ${dialog.message()}`);
    void dialog.dismiss();
  });
  await tab.goto(`${origin}/`);

  const capture = (name, target = tab) =>
    screenshots
      ? target.screenshot({
          fullPage: target === tab,
          path: join(screenshots, `${name}.png`),
        })
      : undefined;
  const renderReact = (value) =>
    tab.evaluate((markdown) => {
      const { BarkdownMarkdown, createElement, createRoot } = window.barkdown;
      window.reactRoot ??= createRoot(document.querySelector("#react"));
      window.reactRoot.render(
        createElement(BarkdownMarkdown, { value: markdown }),
      );
    }, value);
  const settled = (root, count) =>
    tab.waitForFunction(
      ([selector, expected]) =>
        [
          ...document.querySelectorAll(
            `${selector} [data-barkdown-mermaid-surface]`,
          ),
        ].filter((surface) => surface.querySelector("svg.pele, .pele-error"))
          .length === expected,
      [root, count],
    );
  const svgs = tab.locator("#react [data-barkdown-mermaid-surface] > svg.pele");
  // Scans every SVG label against the filled shapes drawn under its centre,
  // composited over the figure background.
  const labelColors = () =>
    tab.evaluate(() => {
      const probe = document.createElement("span");
      document.body.append(probe);
      const rgba = (element, value) => {
        const color = getComputedStyle(element).color;
        probe.style.color = value.replace(/currentcolor/gi, color);
        const resolved = getComputedStyle(probe).color;
        const [red, green, blue, alpha = 1] = resolved
          .match(/[\d.]+(?:e-?\d+)?/g)
          .map(Number);
        const scale = resolved.startsWith("color(") ? 255 : 1;
        return [red * scale, green * scale, blue * scale, alpha];
      };
      const over = (top, bottom) =>
        [0, 1, 2].map((i) => top[i] * top[3] + bottom[i] * (1 - top[3]));
      const figures = [
        ...document.querySelectorAll("#react [data-barkdown-mermaid]"),
      ];
      const background = (figure) =>
        over(
          rgba(figure, getComputedStyle(figure).backgroundColor),
          [255, 255, 255],
        );
      const labels = figures.flatMap((figure) => {
        const shapes = [
          ...figure.querySelectorAll(
            "svg.pele :is(rect, path, polygon, circle, ellipse)",
          ),
        ];
        return [...figure.querySelectorAll("svg.pele text")].flatMap((text) => {
          const box = text.getBoundingClientRect();
          if (!text.textContent.trim() || !box.width) return [];
          const x = box.left + box.width / 2;
          const y = box.top + box.height / 2;
          let back = background(figure);
          for (const shape of shapes) {
            const style = getComputedStyle(shape);
            const area = shape.getBoundingClientRect();
            if (
              shape.compareDocumentPosition(text) &
                Node.DOCUMENT_POSITION_PRECEDING ||
              style.fill === "none" ||
              area.left > x ||
              area.right < x ||
              area.top > y ||
              area.bottom < y ||
              area.width >= box.width * 40
            ) {
              continue;
            }
            const fill = rgba(shape, style.fill);
            fill[3] *= Number(style.fillOpacity) * Number(style.opacity);
            back = over(fill, back);
          }
          const front = rgba(text, getComputedStyle(text).fill);
          return [
            {
              back,
              front: over(front, back),
              text: text.textContent.trim(),
            },
          ];
        });
      });
      const page = background(figures[0]);
      probe.remove();
      return { background: page, labels };
    });
  const checkContrast = async (scheme) => {
    const { background, labels } = await labelColors();
    assert.ok(labels.length > 250, `${scheme}: ${labels.length} labels`);
    assert.deepEqual(
      labels
        .filter((label) => contrast(label.front, label.back) < 4.5)
        .map((label) => label.text),
      [],
      `${scheme}: labels below 4.5:1`,
    );
    return luminance(background);
  };
  // Pele shows a short error over an earlier diagram and keeps the full
  // message in the title attribute.
  const errorText = async (error) =>
    (await error.getAttribute("title")) || (await error.textContent());

  await t.test("all 23 example fences render readable SVG", async () => {
    await renderReact(examples.join("\n\n"));
    await settled("#react", 23);
    assert.equal(await svgs.count(), 23);
    assert.equal(await tab.locator("#react .pele-error").count(), 0);
    assert.equal(
      await tab.locator("#react [data-barkdown-mermaid-status]").count(),
      0,
    );
    assert.deepEqual(
      await tab
        .locator("#react [data-barkdown-mermaid-viewport]")
        .evaluateAll((elements) =>
          elements.filter(
            (element) => element.scrollWidth > element.clientWidth + 1,
          ),
        ),
      [],
      "diagrams fit the viewport width",
    );

    const diagrams = await svgs.evaluateAll((elements) =>
      elements.map((svg) => ({
        labels: [...svg.querySelectorAll("text")]
          .filter((text) => text.textContent.trim())
          .map((text) => {
            const box = text.getBoundingClientRect();
            return { height: box.height, text: text.textContent.trim() };
          }),
        overflow: [...svg.querySelectorAll(".pele-node")].flatMap((node) => {
          const shape = node.querySelector("rect, polygon, circle, ellipse");
          const label = node.querySelector(".pele-label");
          if (!shape || !label?.textContent.trim()) return [];
          const outer = shape.getBoundingClientRect();
          const inner = label.getBoundingClientRect();
          return inner.left < outer.left - 1 || inner.right > outer.right + 1
            ? [label.textContent]
            : [];
        }),
      })),
    );
    for (const diagram of diagrams) {
      assert.ok(diagram.labels.length > 0, "each diagram has text labels");
      assert.ok(diagram.labels.every((label) => label.height > 0));
      assert.deepEqual(diagram.overflow, [], "labels fit their nodes");
    }
    const text = diagrams.flatMap((diagram) =>
      diagram.labels.map((label) => label.text),
    );
    for (const label of ["Alice", "Bob", "Animal", "Processing", "Python"]) {
      assert.ok(
        text.some((value) => value.includes(label)),
        `label ${label} is rendered`,
      );
    }
    await capture("react-examples-light");

    assert.ok((await checkContrast("light")) > 0.8);

    for (const [name, apply, reset] of [
      [
        "prefers-dark",
        () => tab.emulateMedia({ colorScheme: "dark" }),
        () => tab.emulateMedia({ colorScheme: "light" }),
      ],
      [
        "host-dark",
        () =>
          tab.evaluate(() =>
            document.documentElement.style.setProperty("color-scheme", "dark"),
          ),
        () =>
          tab.evaluate(() =>
            document.documentElement.style.removeProperty("color-scheme"),
          ),
      ],
      [
        "vitepress-dark",
        () =>
          tab.evaluate(() => document.documentElement.classList.add("dark")),
        () =>
          tab.evaluate(() => document.documentElement.classList.remove("dark")),
      ],
    ]) {
      await apply();
      assert.ok((await checkContrast(name)) < 0.1, name);
      await capture(`react-examples-${name}`);
      await reset();
    }
  });

  await t.test("identical diagrams keep unique ids", async () => {
    await renderReact(
      [fence(titled), fence(titled), fence(flowchart)].join("\n\n"),
    );
    await settled("#react", 3);
    const ids = await tab
      .locator("#react svg.pele [id]")
      .evaluateAll((elements) => elements.map((element) => element.id));
    assert.ok(ids.length >= 4);
    assert.equal(new Set(ids).size, ids.length);
    const labelled = await svgs.evaluateAll((elements) =>
      elements.slice(0, 2).map((svg) => {
        const title = svg.getAttribute("aria-labelledby");
        return title && svg.querySelector(`#${CSS.escape(title)}`)?.textContent;
      }),
    );
    assert.deepEqual(labelled, ["Release flow", "Release flow"]);
  });

  await t.test(
    "edits recover from invalid diagrams with text errors",
    async () => {
      await renderReact(fence(flowchart));
      await svgs.first().waitFor();
      await renderReact(fence(invalid));
      const error = tab.locator("#react .pele-error");
      await error.waitFor();
      assert.match(await errorText(error), /<img src=x onerror=/);
      assert.equal(await tab.locator("#react img").count(), 0);
      await capture("react-invalid-edit");

      await renderReact(
        fence(`${flowchart}\n  publish --> archive["Archive"]`),
      );
      await tab
        .locator("#react svg.pele text", { hasText: "Archive" })
        .waitFor();
      assert.equal(await error.count(), 0);

      for (const source of [flowchart, invalid, titled]) {
        await renderReact(fence(source));
      }
      await tab
        .locator("#react svg.pele text", { hasText: "Release" })
        .waitFor();
      assert.equal(await error.count(), 0);
      assert.equal(await svgs.count(), 1);
    },
  );

  await t.test("hostile diagram input cannot run script", async () => {
    await renderReact(hostile.map(fence).join("\n\n"));
    await settled("#react", hostile.length);
    const nodes = tab.locator("#react svg.pele .pele-node:not(:has(a))");
    for (const node of await nodes.all()) {
      await node.hover();
      await node.click();
    }
    const unsafe = await tab.evaluate(() => {
      const elements = [...document.querySelectorAll("#react figure *")];
      return {
        errors: [...document.querySelectorAll("#react .pele-error")].map(
          (error) => error.textContent,
        ),
        handlers: elements.flatMap((element) =>
          element.getAttributeNames().filter((name) => name.startsWith("on")),
        ),
        tags: elements
          .map((element) => element.localName)
          .filter((name) =>
            [
              "embed",
              "foreignobject",
              "iframe",
              "img",
              "object",
              "script",
            ].includes(name.toLowerCase()),
          ),
        urls: elements.flatMap((element) =>
          ["href", "xlink:href", "src"]
            .map((name) => element.getAttribute(name))
            .filter(
              (value) =>
                value && /^\s*(javascript|data|vbscript):/i.test(value),
            ),
        ),
        xss: window.__xss,
      };
    });
    assert.deepEqual(unsafe, {
      errors: [],
      handlers: [],
      tags: [],
      urls: [],
      xss: undefined,
    });
    assert.equal(new URL(tab.url()).pathname, "/");
    await capture("react-hostile");
  });

  await t.test("VitePress component keeps its controls", async () => {
    await tab.evaluate(
      ([source, repeated]) => {
        const { BarkdownMermaid, createApp, h, reactive, ref } =
          window.barkdown;
        window.vueDiagram = ref(source);
        window.vueConfig = reactive({ flowchart: { rankSpacing: 40 } });
        createApp({
          render: () => [
            h(BarkdownMermaid, {
              config: window.vueConfig,
              diagram: window.vueDiagram.value,
              title: "VitePress diagram",
            }),
            h(BarkdownMermaid, { diagram: repeated }),
            h(BarkdownMermaid, { diagram: repeated }),
          ],
        }).mount("#vue");
      },
      [`\n${flowchart}\n`, titled],
    );
    await settled("#vue", 3);
    const ids = await tab
      .locator("#vue svg.pele [id]")
      .evaluateAll((elements) => elements.map((element) => element.id));
    assert.ok(ids.length >= 4);
    assert.equal(new Set(ids).size, ids.length);

    const figure = tab.locator("#vue [data-barkdown-mermaid]").first();
    const surface = figure.locator("[data-barkdown-mermaid-surface]");
    const button = (label) => figure.getByRole("button", { name: label });
    assert.equal(await figure.getAttribute("aria-label"), "VitePress diagram");

    const viewBox = () => surface.locator("svg.pele").getAttribute("viewBox");
    const narrow = await viewBox();
    await tab.evaluate(() => {
      window.vueConfig.flowchart = { rankSpacing: 90 };
    });
    await tab.waitForFunction(
      (before) =>
        document
          .querySelector("#vue [data-barkdown-mermaid-surface] > svg.pele")
          ?.getAttribute("viewBox") !== before,
      narrow,
    );
    assert.ok(
      Number((await viewBox()).split(" ")[2]) > Number(narrow.split(" ")[2]),
      "a deep config change redraws the diagram",
    );
    assert.equal(
      await figure
        .locator(".pele-zoom, button:not([data-barkdown-mermaid-action])")
        .count(),
      0,
    );

    await button("Zoom in").click();
    assert.equal(await button("Reset zoom").textContent(), "115%");
    assert.match(await surface.getAttribute("style"), /scale\(1\.15\)/);
    await capture("vitepress-zoomed", figure);
    await button("Zoom out").click();
    await button("Zoom out").click();
    assert.equal(await button("Reset zoom").textContent(), "85%");
    await button("Reset zoom").click();
    assert.match(await surface.getAttribute("style"), /scale\(1\)/);

    await button("Open fullscreen").click();
    assert.match(await figure.getAttribute("class"), /is-fullscreen/);
    assert.equal(
      await figure.evaluate((element) => getComputedStyle(element).position),
      "fixed",
    );
    await surface.locator("svg.pele").waitFor();
    await capture("vitepress-fullscreen");
    await button("Exit fullscreen").click();
    assert.doesNotMatch(await figure.getAttribute("class"), /is-fullscreen/);

    await button("Copy Mermaid source").click();
    assert.equal(
      await tab.evaluate(() => navigator.clipboard.readText()),
      flowchart,
    );

    const [download] = await Promise.all([
      tab.waitForEvent("download"),
      button("Download SVG").click(),
    ]);
    assert.match(download.suggestedFilename(), /^barkdown-mermaid-\d+\.svg$/);
    const file = await readFile(await download.path(), "utf8");
    assert.match(file, /^<svg [^>]*class="pele pele-flowchart"/);
    assert.match(file, /var\(--pele-fg,#1f1f1f\)/);
    assert.match(file, />Approved\?</);
    await capture("vitepress-controls", figure);

    await tab.evaluate((source) => {
      window.vueDiagram.value = source;
    }, invalid);
    const error = figure.locator(".pele-error");
    await error.waitFor();
    assert.match(await errorText(error), /<img src=x onerror=/);
    assert.equal(await figure.locator("img").count(), 0);

    await tab.evaluate(
      (sources) => {
        for (const source of sources) window.vueDiagram.value = source;
      },
      [flowchart, invalid, hostile[0]],
    );
    await figure.locator("svg.pele .pele-node").nth(2).waitFor();
    assert.equal(await error.count(), 0);
    assert.equal(await figure.locator("svg script, svg img").count(), 0);
    assert.equal(await tab.evaluate(() => window.__xss), undefined);
  });

  assert.deepEqual(problems, []);
});
