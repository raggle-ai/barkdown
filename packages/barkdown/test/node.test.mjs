import assert from "node:assert/strict"
import { mkdir, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

import { readFolder } from "../dist/node.js"

test("readFolder reads Markdown, HTML, and text in path order", async () => {
  const root = await mkdtemp(join(tmpdir(), "barkdown-"))
  await mkdir(join(root, "guide"))
  await mkdir(join(root, "node_modules"))
  await writeFile(join(root, "README.md"), "# Read me")
  await writeFile(join(root, "guide", "notes.txt"), "Plain notes")
  await writeFile(join(root, "guide", "outline.markdown"), "# Outline")
  await writeFile(join(root, "guide", "page.html"), "<h1>Page</h1>")
  await writeFile(join(root, "guide", "ignored.js"), "alert(1)")
  await writeFile(join(root, "node_modules", "hidden.md"), "# Hidden")

  assert.deepEqual(await readFolder(root), {
    root,
    documents: [
      { path: "guide/notes.txt", content: "Plain notes", kind: "text" },
      { path: "guide/outline.markdown", content: "# Outline", kind: "markdown" },
      { path: "guide/page.html", content: "<h1>Page</h1>", kind: "html" },
      { path: "README.md", content: "# Read me", kind: "markdown" },
    ],
  })
})
