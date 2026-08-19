import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the extension runs on local folders", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../manifest.json", import.meta.url), "utf8"),
  );
  assert.equal(manifest.content_scripts[0].matches.includes("file:///*"), true);
  assert.deepEqual(manifest.content_scripts[0].css, ["style.css"]);
  assert.equal(
    manifest.content_scripts[1].matches.includes("file:///*.html"),
    false,
  );
});

test("the local folder view does not redirect to Kennel", async () => {
  const content = await readFile(
    new URL("../src/content.tsx", import.meta.url),
    "utf8",
  );
  assert.equal(content.includes("requestPreview"), false);
  assert.equal(content.includes("Open in Kennel"), false);
});

test("the local folder view snapshots links before replacing the page", async () => {
  const content = await readFile(
    new URL("../src/content.tsx", import.meta.url),
    "utf8",
  );
  assert.equal(content.includes("const initialLinks"), true);
  assert.equal(content.includes("function readFolder"), true);
  assert.equal(content.includes("function folderLinks"), true);
});
