import assert from "node:assert/strict";
import test from "node:test";

import { activeHeadingIndex } from "../dist/use-reading-position.js";

test("activeHeadingIndex returns the last heading at or above the reading line", () => {
  const tops = [-500, -120, 40, 300, 900];
  assert.equal(activeHeadingIndex(tops, 0), 1);
  assert.equal(activeHeadingIndex(tops, 40), 2);
  assert.equal(activeHeadingIndex(tops, 1000), 4);
  assert.equal(activeHeadingIndex(tops, -600), -1);
  assert.equal(activeHeadingIndex([], 10), -1);
});
