import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const styles = await readFile(
  new URL("../styles.css", import.meta.url),
  "utf8",
);

test("Barkdown restores list markers after consumer CSS resets", () => {
  assert.match(styles, /\[data-barkdown\] ul \{\s+list-style-type: disc;/);
  assert.match(styles, /\[data-barkdown\] ol \{\s+list-style-type: decimal;/);
  assert.match(
    styles,
    /\[data-barkdown\] ul\.contains-task-list \{\s+list-style-type: none;/,
  );
});

test("Barkdown gives links an overridable blue color", () => {
  assert.match(styles, /--barkdown-link-color: #0969da;/);
  assert.match(
    styles,
    /\[data-barkdown\] a \{\s+color: var\(--barkdown-link-color\);/,
  );
});
