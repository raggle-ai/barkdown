import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

import { requestPreview } from "../src/preview.ts"

test("the extension runs on local folders", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("../manifest.json", import.meta.url), "utf8"),
  )
  assert.equal(manifest.content_scripts[0].matches.includes("file:///*"), true)
})

test("requestPreview sends a local folder to the native reader", async () => {
  let message
  assert.equal(
    await requestPreview("file:///docs/", async (value) => {
      message = value
      return { url: "http://127.0.0.1:5173/" }
    }),
    "http://127.0.0.1:5173/",
  )
  assert.deepEqual(message, { type: "open-folder", url: "file:///docs/" })
})
