import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

import { barkdownPlugin } from "../dist/vite.js"

test("barkdownPlugin reads the folder in the path query", async () => {
  const root = mkdtempSync(join(tmpdir(), "barkdown-vite-"))
  const selected = join(root, "selected")
  mkdirSync(selected)
  writeFileSync(join(selected, "README.md"), "# Selected\n")

  const watched = []
  let middleware
  barkdownPlugin(root).configureServer({
    watcher: {
      add(path) {
        watched.push(path)
      },
      on() {},
    },
    ws: { send() {} },
    middlewares: {
      use(handler) {
        middleware = handler
      },
    },
  })

  let status
  let body = ""
  await middleware(
    { url: `/api/documents?path=${encodeURIComponent(selected)}` },
    {
      writeHead(value) {
        status = value
      },
      end(value) {
        body = value
      },
    },
    () => assert.fail("The API middleware called next"),
  )

  assert.equal(status, 200)
  assert.deepEqual(JSON.parse(body), {
    root: selected,
    documents: [
      { path: "README.md", content: "# Selected\n", kind: "markdown" },
    ],
  })
  assert.ok(watched.some((path) => path.startsWith(selected)))
})
