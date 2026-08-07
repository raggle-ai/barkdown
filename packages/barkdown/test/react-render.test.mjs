import assert from "node:assert/strict"
import test from "node:test"

import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { BarkdownMarkdown } from "../dist/index.js"

test("BarkdownMarkdown renders math, highlighted code, and Mermaid containers", () => {
  const value = [
    String.raw`Inline math: $\frac{1}{x}$`,
    "",
    "```ts",
    "const answer = 42",
    "```",
    "",
    "```mermaid",
    "graph TD",
    "  A --> B",
    "```",
  ].join("\n")

  const html = renderToStaticMarkup(
    createElement(BarkdownMarkdown, { value }),
  )

  assert.match(html, /class="katex"/)
  assert.match(html, /class="hljs-keyword"/)
  assert.match(html, /data-barkdown-mermaid=""/)
  assert.doesNotMatch(html, /<pre><figure/)
})
