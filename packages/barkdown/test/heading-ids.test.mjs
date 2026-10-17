import assert from "node:assert/strict";
import test from "node:test";

import { HeadingIdRegistry, slugify } from "../dist/heading-ids.js";

test("slugify keeps letters and digits from every script", () => {
  assert.equal(slugify("Account & Billing!"), "account-billing");
  assert.equal(slugify("  Spaced   out  "), "spaced-out");
  assert.equal(
    slugify("Δημοτικό Συμβούλιο Αλίμου"),
    "δημοτικό-συμβούλιο-αλίμου",
  );
  assert.equal(slugify("Segment 1: Budget"), "segment-1-budget");
  assert.equal(slugify("***"), "");
});

test("HeadingIdRegistry suffixes duplicates and respects reserved ids", () => {
  const registry = new HeadingIdRegistry();

  assert.equal(registry.id("Notes"), "notes");
  assert.equal(registry.id("Notes"), "notes-1");
  assert.equal(registry.id(""), "section");

  registry.reserve("summary");
  registry.reserve("summary-1");
  assert.equal(registry.id("Summary"), "summary-2");
  assert.equal(registry.id("Summary"), "summary-3");
});
