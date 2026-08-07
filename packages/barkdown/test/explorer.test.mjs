import assert from "node:assert/strict"
import test from "node:test"

import { folderName } from "../dist/explorer.js"

test("folderName returns the active folder name", () => {
  assert.equal(folderName("/Users/example/clients/flutter/"), "flutter")
  assert.equal(folderName("C:\\Users\\example\\notes"), "notes")
})
