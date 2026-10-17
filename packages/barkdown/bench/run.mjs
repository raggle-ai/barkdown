#!/usr/bin/env node
/**
 * Large-document benchmark.
 *
 * Renders the generated transcript fixture (or a private file given with
 * `--fixture`) in headless Chromium with the built package and reports the
 * main-thread blocking time, time to complete, long tasks, DOM size, and
 * scroll frame time for each rendering mode. Run from `packages/barkdown`:
 *
 *   pnpm bench                       # build, then run every scenario
 *   node bench/run.mjs --scenarios standard,progressive --sizes 0.25,1
 *   node bench/run.mjs --fixture ~/notes/transcript.md --runs 5
 *
 * Results print as a Markdown table and are written to
 * `bench/.generated/results.json`. The fixture and results stay out of git.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { chromium } from "@playwright/test";
import { build } from "esbuild";

import { generateFixture } from "./generate-fixture.mjs";

const here = new URL(".", import.meta.url).pathname;
const generated = resolve(here, ".generated");

const { values: args } = parseArgs({
  options: {
    fixture: { type: "string" },
    scenarios: {
      type: "string",
      default: "standard,progressive,plain-text,reader",
    },
    sizes: { type: "string", default: "1" },
    runs: { type: "string", default: "3" },
    browser: { type: "string", default: process.env.BARKDOWN_BENCH_BROWSER },
    json: { type: "string" },
  },
});

const runs = Number(args.runs);
const sizes = args.sizes.split(",").map(Number);
const scenarios = args.scenarios.split(",");

await mkdir(generated, { recursive: true });
const fixturePath = args.fixture
  ? resolve(args.fixture)
  : resolve(generated, "transcript-558k.md");
if (!args.fixture && !existsSync(fixturePath)) {
  await writeFile(fixturePath, generateFixture(), "utf8");
}
const fixture = await readFile(fixturePath, "utf8");

const bundle = resolve(generated, "app.js");
await build({
  entryPoints: [resolve(here, "app.tsx")],
  bundle: true,
  format: "iife",
  jsx: "automatic",
  platform: "browser",
  target: "es2022",
  define: { "process.env.NODE_ENV": '"production"' },
  outfile: bundle,
  logLevel: "error",
});

const styles = (await readFile(resolve(here, "../styles.css"), "utf8")).replace(
  /^@import .*;$/gm,
  "",
);
const page_ = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><style>
  body { margin: 0; color: rgb(31, 35, 40); font: 16px/1.6 sans-serif; }
  ${styles}
</style></head>
<body></body>
<script>${await readFile(bundle, "utf8")}</script>
</html>`;

const browser = await chromium.launch({
  ...(args.browser
    ? { executablePath: args.browser }
    : { channel: "chromium" }),
  headless: true,
});
const results = [];
const exportsSeen = new Set();
try {
  for (const size of sizes) {
    const text = truncate(fixture, size);
    const label = `${Math.round(size * 100)}% (${(Buffer.byteLength(text) / 1024).toFixed(0)} KiB, ${text.split("\n").length - 1} lines)`;
    for (const scenario of scenarios) {
      const samples = [];
      for (let run = 0; run < runs; run += 1) {
        const page = await browser.newPage({
          viewport: { width: 1200, height: 900 },
        });
        await page.setContent(page_, { waitUntil: "load" });
        const available = await page.evaluate(
          () => window.barkdownBench.exports,
        );
        available.forEach((name) => exportsSeen.add(name));
        if (!supported(scenario, available)) {
          await page.close();
          break;
        }
        const metrics = await page.evaluate(
          ([name, value]) => window.barkdownBench.run(name, value),
          [scenario, text],
        );
        samples.push(metrics);
        await page.close();
      }
      if (samples.length) {
        results.push({
          size: label,
          scenario,
          median: median(samples),
          samples,
        });
      }
    }
  }
} finally {
  await browser.close();
}

const table = [
  "| Fixture | Scenario | Blocking ms | Complete ms | Longest task ms | Long tasks | DOM nodes | Headings | Scroll frame ms | Height first/final px | Heap MB |",
  "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ...results.map(
    ({ size, scenario, median: m }) =>
      `| ${size} | ${scenario} | ${m.blockingMs.toFixed(0)} | ${m.completeMs.toFixed(0)} | ${m.longestTaskMs.toFixed(0)} | ${m.longTasks} | ${m.domNodes} | ${m.headings} | ${m.scrollFrameMs.toFixed(1)} | ${m.initialHeightPx} / ${m.finalHeightPx} | ${m.heapMb?.toFixed(0) ?? "-"} |`,
  ),
].join("\n");

console.log(`Fixture: ${fixturePath}`);
console.log(`Runs per scenario: ${runs} (median shown)\n`);
console.log(table);
const output = resolve(args.json ?? resolve(generated, "results.json"));
await writeFile(
  output,
  JSON.stringify(
    { fixture: fixturePath, runs, date: new Date().toISOString(), results },
    null,
    2,
  ),
);
console.log(`\nWrote ${output}`);

function truncate(text, ratio) {
  if (ratio >= 1) return text;
  const lines = text.split("\n");
  return (
    lines.slice(0, Math.max(1, Math.floor(lines.length * ratio))).join("\n") +
    "\n"
  );
}

function supported(scenario, available) {
  if (scenario === "plain-text") return available.includes("BarkdownPlainText");
  if (scenario === "reader") return available.includes("BarkdownReader");
  return available.includes("BarkdownMarkdown");
}

function median(samples) {
  const keys = Object.keys(samples[0]).filter(
    (key) => typeof samples[0][key] === "number",
  );
  const result = { ...samples[0] };
  for (const key of keys) {
    const sorted = samples.map((sample) => sample[key]).sort((a, b) => a - b);
    result[key] = sorted[Math.floor(sorted.length / 2)];
  }
  return result;
}
