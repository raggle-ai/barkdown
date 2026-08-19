import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const bundleUrl = new URL("../extension-dist/content.js", import.meta.url);
const stylesUrl = new URL("../extension-dist/style.css", import.meta.url);

test("the extension bundle contains the shared collapsible section markup", async (t) => {
  try {
    await access(bundleUrl);
  } catch {
    t.skip("extension-dist is missing; run pnpm extension:dist first");
    return;
  }

  const bundle = await readFile(bundleUrl, "utf8");
  assert.match(bundle, /barkdown-heading-toggle/);
  assert.match(bundle, /barkdown-section-content/);
  assert.match(bundle, /aria-expanded/);
  assert.match(bundle, /aria-controls/);
});

test("the extension stylesheet contains the collapsible section styles", async (t) => {
  try {
    await access(stylesUrl);
  } catch {
    t.skip("extension-dist is missing; run pnpm extension:dist first");
    return;
  }

  const styles = await readFile(stylesUrl, "utf8");
  assert.match(styles, /barkdown-heading-toggle/);
  assert.match(styles, /barkdown-section-content/);
});
