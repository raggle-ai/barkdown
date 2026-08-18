import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

import { folderName } from "../dist/explorer.js"

test("folderName returns the active folder name", () => {
  assert.equal(folderName("/Users/example/clients/flutter/"), "flutter")
  assert.equal(folderName("C:\\Users\\example\\notes"), "notes")
})

test("BarkdownExplorer enables collapsible headings in the shared viewer", async () => {
  const bundle = await readFile(new URL("../dist/explorer.js", import.meta.url), "utf8")
  assert.match(bundle, /collapsibleHeadings:\s*true/)
})
