import assert from "node:assert/strict"
import test from "node:test"

import {
  documentMatches,
  documentPath,
  documentUrl,
} from "../dist/documents.js"

test("documentMatches searches file paths and file contents", () => {
  const document = {
    path: "meetings/planning.txt",
    content: "The launch phrase is blue lantern.",
    kind: "text",
  }

  assert.equal(documentMatches(document, "planning"), true)
  assert.equal(documentMatches(document, "BLUE LANTERN"), true)
  assert.equal(documentMatches(document, "missing"), false)
})

test("documentUrl preserves the folder target during document navigation", () => {
  const url = documentUrl(
    "http://127.0.0.1:5173/?file=/Users/example/client",
    "meetings/notes.txt",
  )

  assert.equal(
    url.href,
    "http://127.0.0.1:5173/?file=%2FUsers%2Fexample%2Fclient&document=meetings%2Fnotes.txt",
  )
  assert.equal(documentPath(url.search), "meetings/notes.txt")
})
