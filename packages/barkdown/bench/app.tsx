/**
 * Browser side of the large-document benchmark. `run.mjs` bundles this file
 * with esbuild against the built package in `dist/`, loads it in Chromium,
 * and calls `window.barkdownBench.run` for each scenario.
 */
import { StrictMode, createElement, type ReactElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import * as barkdown from "../dist/index.js";

type Metrics = {
  scenario: string;
  /** Main-thread time of the first synchronous render, in ms. */
  blockingMs: number;
  /** Time until the scenario reports that the whole document is rendered. */
  completeMs: number;
  /** Longest single long task observed during the run. */
  longestTaskMs: number;
  longTasks: number;
  domNodes: number;
  headings: number;
  /** Frame interval right after a jump to the middle of the document. */
  scrollFrameMs: number;
  /** Page height after the first paint and once rendering completed. */
  initialHeightPx: number;
  finalHeightPx: number;
  heapMb?: number;
};

type Options = {
  largeDocument?: Record<string, unknown> | false;
  collapsibleHeadings?: boolean;
  view?: "rendered" | "source";
};

declare global {
  interface Window {
    barkdownBench: {
      run(scenario: string, text: string, options?: Options): Promise<Metrics>;
      exports: string[];
    };
  }
}

const nextFrame = () =>
  new Promise<number>((resolve) =>
    requestAnimationFrame((time) => resolve(time)),
  );

function element(
  scenario: string,
  text: string,
  options: Options,
  onDone: () => void,
): ReactElement {
  const exports = barkdown as Record<string, unknown>;
  if (scenario === "plain-text") {
    const PlainText = exports["BarkdownPlainText"] as React.ComponentType<any>;
    return createElement(PlainText, { value: text });
  }
  if (scenario === "reader") {
    const Reader = exports["BarkdownReader"] as React.ComponentType<any>;
    return createElement(Reader, {
      value: text,
      largeDocument: options.largeDocument,
      collapsibleHeadings: options.collapsibleHeadings,
      defaultView: options.view,
      onRenderProgress: (progress: { done: boolean }) => {
        if (progress.done) onDone();
      },
    });
  }
  return createElement(barkdown.BarkdownMarkdown, {
    value: text,
    collapsibleHeadings: options.collapsibleHeadings,
    ...(scenario === "standard"
      ? { largeDocument: false }
      : { largeDocument: options.largeDocument }),
    onRenderProgress: (progress: { done: boolean }) => {
      if (progress.done) onDone();
    },
  } as Record<string, unknown>);
}

async function run(
  scenario: string,
  text: string,
  options: Options = {},
): Promise<Metrics> {
  const container = document.createElement("main");
  container.style.cssText = "max-width: 760px; margin: 0 auto; padding: 24px";
  document.body.replaceChildren(container);
  const root = createRoot(container);

  const tasks: number[] = [];
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) tasks.push(entry.duration);
  });
  observer.observe({ type: "longtask", buffered: false });

  let done!: () => void;
  const complete = new Promise<void>((resolve) => {
    done = resolve;
  });
  const synchronous = scenario === "standard" || scenario === "plain-text";

  const start = performance.now();
  flushSync(() => {
    root.render(
      createElement(StrictMode, null, element(scenario, text, options, done)),
    );
  });
  const blockingMs = performance.now() - start;
  const initialHeightPx = document.documentElement.scrollHeight;
  if (!synchronous) {
    await Promise.race([
      complete,
      new Promise((resolve) => setTimeout(resolve, 60_000)),
    ]);
  }
  const completeMs = performance.now() - start;
  await nextFrame();
  await nextFrame();
  observer.disconnect();

  window.scrollTo(0, document.documentElement.scrollHeight / 2);
  const frameA = await nextFrame();
  const frameB = await nextFrame();
  window.scrollTo(0, 0);

  const memory = (
    performance as Performance & { memory?: { usedJSHeapSize: number } }
  ).memory;
  const metrics: Metrics = {
    scenario,
    blockingMs,
    completeMs,
    longestTaskMs: tasks.length ? Math.max(...tasks) : 0,
    longTasks: tasks.length,
    domNodes: container.getElementsByTagName("*").length,
    headings: container.querySelectorAll("h1, h2, h3, h4, h5, h6").length,
    scrollFrameMs: frameB - frameA,
    initialHeightPx,
    finalHeightPx: document.documentElement.scrollHeight,
    heapMb: memory ? memory.usedJSHeapSize / 1_048_576 : undefined,
  };
  root.unmount();
  container.remove();
  return metrics;
}

window.barkdownBench = { run, exports: Object.keys(barkdown) };
