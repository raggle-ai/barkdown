import assert from "node:assert/strict";
import test from "node:test";

import { BoundedCache } from "../dist/bounded-cache.js";

test("BoundedCache evicts the least recently used entry past maxEntries", () => {
  const evicted = [];
  const cache = new BoundedCache({
    maxEntries: 2,
    onEvict: (key, value, reason) => evicted.push([key, value, reason]),
  });

  cache.set("a", 1).set("b", 2);
  assert.equal(cache.get("a"), 1, "reading a makes it most recent");
  cache.set("c", 3);

  assert.deepEqual([...cache.keys()], ["a", "c"]);
  assert.deepEqual(evicted, [["b", 2, "capacity"]]);
});

test("BoundedCache evicts by measured size but always keeps the newest entry", () => {
  const cache = new BoundedCache({
    maxEntries: 10,
    maxBytes: 10,
    size: (value) => value.length,
  });

  cache.set("a", "aaaa").set("b", "bbbb");
  assert.equal(cache.bytes, 8);
  cache.set("c", "cccc");
  assert.deepEqual([...cache.keys()], ["b", "c"]);
  assert.equal(cache.bytes, 8);

  cache.set("huge", "x".repeat(50));
  assert.deepEqual(
    [...cache.keys()],
    ["huge"],
    "an oversized value evicts the rest and stays",
  );
  assert.equal(cache.bytes, 50);
});

test("BoundedCache supports delete, invalidate, and clear with eviction hooks", () => {
  const reasons = [];
  const cache = new BoundedCache({
    onEvict: (key, _value, reason) => reasons.push(`${key}:${reason}`),
  });
  cache.set("docs/a.md", 1).set("docs/b.md", 2).set("notes.md", 3);

  assert.equal(cache.delete("notes.md"), true);
  assert.equal(cache.delete("notes.md"), false);
  assert.equal(
    cache.invalidate((key) => key.startsWith("docs/")),
    2,
  );
  assert.equal(cache.size, 0);

  cache.set("x", 1);
  cache.clear();
  assert.equal(cache.has("x"), false);
  assert.deepEqual(reasons, [
    "notes.md:delete",
    "docs/a.md:invalidate",
    "docs/b.md:invalidate",
    "x:clear",
  ]);
});

test("BoundedCache replaces an existing key without double counting", () => {
  const cache = new BoundedCache({ maxBytes: 100, size: (value) => value });
  cache.set("a", 40);
  cache.set("a", 60);
  assert.equal(cache.size, 1);
  assert.equal(cache.bytes, 60);
});
