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
  assert.match(styles, /\[data-barkdown\] ul ul \{\s+list-style-type: circle;/);
  assert.match(
    styles,
    /\[data-barkdown\] ol ol \{\s+list-style-type: lower-alpha;/,
  );
});

test("Barkdown gives links accessible, overridable interaction states", () => {
  assert.match(styles, /--barkdown-link-color: #0969da;/);
  assert.match(styles, /--barkdown-link-hover-color: #0550ae;/);
  assert.match(
    styles,
    /\[data-barkdown\] a \{\s+color: var\(--barkdown-link-color\);/,
  );
  assert.match(styles, /\[data-barkdown\] a:hover \{/);
  assert.match(styles, /\[data-barkdown\] a:focus-visible \{/);
});

test("Barkdown explicitly styles supporting and rich content", () => {
  for (const selector of [
    "small",
    "del",
    "blockquote",
    "code",
    "table",
    "hr",
    "img",
  ]) {
    assert.match(styles, new RegExp(`\\[data-barkdown\\] ${selector} \\{`));
  }
});
