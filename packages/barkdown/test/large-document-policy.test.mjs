import assert from "node:assert/strict";
import test from "node:test";

import {
  defaultLargeDocumentPolicy,
  isLargeDocument,
  renderMode,
  resolveLargeDocumentPolicy,
} from "../dist/large-document-policy.js";

test("resolveLargeDocumentPolicy merges overrides onto the defaults", () => {
  const policy = resolveLargeDocumentPolicy({ bytes: 1000, chunkBytes: 500 });

  assert.equal(policy.bytes, 1000);
  assert.equal(policy.chunkBytes, 500);
  assert.equal(policy.lines, defaultLargeDocumentPolicy.lines);
  assert.equal(policy.lazyHighlight, true);
  assert.deepEqual(resolveLargeDocumentPolicy(), defaultLargeDocumentPolicy);
});

test("resolveLargeDocumentPolicy rejects invalid thresholds", () => {
  assert.throws(() => resolveLargeDocumentPolicy({ bytes: -1 }), RangeError);
  assert.throws(
    () => resolveLargeDocumentPolicy({ lines: Number.NaN }),
    RangeError,
  );
});

test("renderMode picks standard, progressive, or plain-text from the thresholds", () => {
  const policy = { bytes: 1000, lines: 100, plainTextBytes: 5000 };

  assert.equal(renderMode({ bytes: 999, lines: 99 }, policy), "standard");
  assert.equal(renderMode({ bytes: 1000, lines: 10 }, policy), "progressive");
  assert.equal(renderMode({ bytes: 10, lines: 100 }, policy), "progressive");
  assert.equal(renderMode({ bytes: 5000, lines: 10 }, policy), "plain-text");
  assert.equal(renderMode({ bytes: 5_000_000, lines: 1 }, false), "standard");
  assert.equal(renderMode({ bytes: 10, lines: 10 }, undefined), "standard");
  assert.equal(
    renderMode(
      { bytes: defaultLargeDocumentPolicy.bytes, lines: 1 },
      undefined,
    ),
    "progressive",
  );
});

test("isLargeDocument uses either threshold", () => {
  const policy = resolveLargeDocumentPolicy({ bytes: 500, lines: 50 });

  assert.equal(isLargeDocument({ bytes: 499, lines: 49 }, policy), false);
  assert.equal(isLargeDocument({ bytes: 500, lines: 0 }, policy), true);
  assert.equal(isLargeDocument({ bytes: 0, lines: 50 }, policy), true);
});
