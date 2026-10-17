import assert from "node:assert/strict";
import test from "node:test";

import {
  LoadCancelledError,
  advanceLoadState,
  createLoadState,
  formatElapsed,
  isLoading,
  loadDocumentContent,
} from "../dist/document-load.js";

const lines = Array.from({ length: 25 }, (_, index) => `line ${index + 1}`);
const full = `${lines.join("\n")}\n`;

/** In-memory source that serves `full` in line ranges and records calls. */
function rangeSource({ delay = 0, fail = false } = {}) {
  const calls = [];
  return {
    calls,
    async read() {
      return {
        root: "/notes",
        documents: [
          {
            path: "long.md",
            kind: "markdown",
            content: `${lines.slice(0, 5).join("\n")}\n`,
            partial: { lines: lines.length, bytes: Buffer.byteLength(full) },
          },
        ],
      };
    },
    async readRange(path, range, options) {
      calls.push({ path, ...range });
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      if (options?.signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      if (fail) throw new Error("disk unplugged");
      const endLine = Math.min(range.endLine, lines.length);
      return {
        content: `${lines.slice(range.startLine - 1, endLine).join("\n")}\n`,
        startLine: range.startLine,
        endLine,
        totalLines: lines.length,
      };
    },
  };
}

test("loadDocumentContent completes a partial document in ranges with reading progress", async () => {
  const source = rangeSource();
  const [document] = (await source.read()).documents;
  const states = [];
  let clock = 1000;

  const content = await loadDocumentContent(source, document, {
    chunkLines: 8,
    onState: (state) => states.push(state),
    now: () => (clock += 100),
  });

  assert.equal(content, full);
  assert.deepEqual(source.calls, [
    { path: "long.md", startLine: 6, endLine: 13 },
    { path: "long.md", startLine: 14, endLine: 21 },
    { path: "long.md", startLine: 22, endLine: 25 },
  ]);
  assert.deepEqual(
    states.map((state) => [state.phase, state.detail, state.progress]),
    [
      ["reading", "5 / 25 lines", 0.2],
      ["reading", "13 / 25 lines", 0.52],
      ["reading", "21 / 25 lines", 0.84],
      ["reading", "25 / 25 lines", 1],
      ["ready", undefined, 1],
    ],
  );
  assert.ok(
    states.at(-1).elapsedMs > 0,
    "elapsed time accumulates across ranges",
  );
  assert.equal(states.at(-1).startedAt, states[0].startedAt);
});

test("loadDocumentContent returns complete documents and sources without ranges unchanged", async () => {
  const states = [];
  const complete = { path: "a.md", kind: "markdown", content: "# A\n" };
  assert.equal(
    await loadDocumentContent(
      { read: async () => ({ root: "/", documents: [] }) },
      complete,
      {
        onState: (state) => states.push(state.phase),
      },
    ),
    "# A\n",
  );
  const partial = { ...complete, partial: { lines: 100, bytes: 1000 } };
  assert.equal(
    await loadDocumentContent(
      { read: async () => ({ root: "/", documents: [] }) },
      partial,
    ),
    "# A\n",
    "without readRange the head is all there is",
  );
  assert.deepEqual(states, ["ready"]);
});

test("loadDocumentContent stops when the signal aborts and reports cancelled", async () => {
  const source = rangeSource({ delay: 5 });
  const [document] = (await source.read()).documents;
  const controller = new AbortController();
  const states = [];

  const pending = loadDocumentContent(source, document, {
    chunkLines: 5,
    signal: controller.signal,
    onState: (state) => states.push(state.phase),
  });
  await new Promise((resolve) => setTimeout(resolve, 7));
  controller.abort();

  await assert.rejects(pending, LoadCancelledError);
  assert.ok(source.calls.length < 4, "later ranges were never requested");
  assert.equal(states.at(-1), "cancelled");
  const reported = states.length;
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(
    states.length,
    reported,
    "nothing is reported after cancellation",
  );
});

test("loadDocumentContent surfaces read failures as the error phase", async () => {
  const source = rangeSource({ fail: true });
  const [document] = (await source.read()).documents;
  const states = [];

  await assert.rejects(
    loadDocumentContent(source, document, {
      onState: (state) => states.push(state),
    }),
    /disk unplugged/,
  );
  assert.equal(states.at(-1).phase, "error");
  assert.equal(states.at(-1).error.message, "disk unplugged");
});

test("advanceLoadState tracks elapsed time and restarts for a new load", () => {
  let state = createLoadState("idle", 1000);
  state = advanceLoadState(state, { phase: "listing" }, 1000);
  state = advanceLoadState(state, { phase: "reading", progress: 0.5 }, 1400);
  assert.equal(state.elapsedMs, 400);
  assert.equal(state.progress, 0.5);
  assert.equal(isLoading(state), true);

  state = advanceLoadState(state, { phase: "ready", progress: 1 }, 1600);
  assert.equal(state.elapsedMs, 600);
  assert.equal(isLoading(state), false);

  state = advanceLoadState(state, { phase: "reading" }, 5000);
  assert.equal(state.startedAt, 5000, "a load after ready starts a new clock");
  assert.equal(state.elapsedMs, 0);

  const failed = advanceLoadState(
    state,
    { phase: "error", error: new Error("x") },
    5100,
  );
  assert.equal(failed.error.message, "x");
  assert.equal(isLoading(failed), false);
});

test("formatElapsed uses seconds below a minute and m:ss above", () => {
  assert.equal(formatElapsed(840), "0.8 s");
  assert.equal(formatElapsed(12_400), "12 s");
  assert.equal(formatElapsed(65_000), "1:05");
});
