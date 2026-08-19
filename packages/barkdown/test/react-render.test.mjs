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

test("collapsibleHeadings wraps content in sections with accessible toggle buttons", () => {
  const value = [
    "## Account",
    "",
    "Account text.",
    "",
    "### Password",
    "",
    "Password text.",
    "",
    "## Billing",
    "",
    "Billing text.",
  ].join("\n")

  const html = renderToStaticMarkup(
    createElement(BarkdownMarkdown, { value, collapsibleHeadings: true }),
  )

  // Sections are wrapped
  assert.match(html, /data-barkdown-section=""/)
  // Toggle buttons with aria attributes
  assert.match(html, /class="barkdown-heading-toggle"/)
  assert.match(html, /aria-expanded="true"/)
  assert.match(html, /aria-controls="[^"]+-content"/)
  // Content sections exist
  assert.match(html, /class="barkdown-section-content"/)
  // Heading wrappers exist
  assert.match(html, /class="barkdown-heading-wrapper"/)
  // Stable heading IDs are present
  assert.match(html, /id="account"/)
  assert.match(html, /id="billing"/)
  assert.match(html, /id="password"/)
})

test("collapsibleHeadings stops content at next same-level heading", () => {
  const value = [
    "## Account",
    "",
    "Account text.",
    "",
    "## Billing",
    "",
    "Billing text.",
  ].join("\n")

  const html = renderToStaticMarkup(
    createElement(BarkdownMarkdown, { value, collapsibleHeadings: true }),
  )

  // Account section should NOT contain Billing text
  const accountIndex = html.indexOf('id="account"')
  const billingIndex = html.indexOf('id="billing"')
  assert.ok(accountIndex < billingIndex, "Account section appears before Billing")
})

test("collapsibleHeadings stops content at a higher-level heading", () => {
  const value = [
    "### Password",
    "",
    "Password text.",
    "",
    "## Billing",
    "",
    "Billing text.",
  ].join("\n")

  const html = renderToStaticMarkup(
    createElement(BarkdownMarkdown, { value, collapsibleHeadings: true }),
  )

  // Password (h3) section closes when Billing (h2) appears
  assert.match(html, /id="password"/)
  assert.match(html, /id="billing"/)
  // Billing should NOT be nested inside Password
  const passwordContentIndex = html.indexOf('id="password-content"')
  const billingIndex = html.indexOf('id="billing"')
  assert.ok(passwordContentIndex < billingIndex, "Password content appears before Billing heading")
})

test("collapsibleHeadings nests child sections inside parent sections", () => {
  const value = [
    "## Account",
    "",
    "Account text.",
    "",
    "### Password",
    "",
    "Password text.",
    "",
    "## Billing",
    "",
    "Billing text.",
  ].join("\n")

  const html = renderToStaticMarkup(
    createElement(BarkdownMarkdown, { value, collapsibleHeadings: true }),
  )

  // Password section should be inside Account content, not outside
  const accountContentStart = html.indexOf('id="account-content"')
  const passwordSection = html.indexOf('id="password"')
  const billingSection = html.indexOf('id="billing"')

  assert.ok(accountContentStart < passwordSection, "Password inside Account content")
  assert.ok(passwordSection < billingSection, "Password before Billing")
})

test("collapsibleHeadings=false keeps normal headings without sections", () => {
  const value = [
    "## Account",
    "",
    "Account text.",
  ].join("\n")

  const html = renderToStaticMarkup(
    createElement(BarkdownMarkdown, { value, collapsibleHeadings: false }),
  )

  assert.doesNotMatch(html, /data-barkdown-section/)
  assert.doesNotMatch(html, /barkdown-heading-toggle/)
  assert.match(html, /<h2/)
})

test("BarkdownMarkdown defaults to collapsibleHeadings off", () => {
  const value = [
    "## Account",
    "",
    "Account text.",
  ].join("\n")

  const html = renderToStaticMarkup(
    createElement(BarkdownMarkdown, { value }),
  )

  assert.doesNotMatch(html, /data-barkdown-section/)
  assert.doesNotMatch(html, /barkdown-heading-toggle/)
})

test("collapsibleHeadings handles duplicate heading text with unique IDs", () => {
  const value = [
    "## Notes",
    "",
    "First set.",
    "",
    "## Notes",
    "",
    "Second set.",
  ].join("\n")

  const html = renderToStaticMarkup(
    createElement(BarkdownMarkdown, { value, collapsibleHeadings: true }),
  )

  // First occurrence gets the base slug, second gets a suffix
  assert.match(html, /id="notes"/)
  assert.match(html, /id="notes-1"/)
})

test("BarkdownMarkdown renders a separate HTML document inline", () => {
  const html = renderToStaticMarkup(
    createElement(BarkdownMarkdown, {
      value: [
        "# Architecture",
        "",
        "```barkdown-html",
        "visualizations/ownership.html",
        "```",
      ].join("\n"),
      htmlEmbed(path) {
        if (path !== "visualizations/ownership.html") return undefined
        return "<button>Show details</button><script>document.querySelector('button').onclick=()=>document.body.dataset.open='yes'</script>"
      },
    }),
  )

  assert.match(html, /data-barkdown-html-embed=""/)
  assert.match(html, /title="ownership"/)
  assert.match(html, /sandbox="allow-scripts"/)
  assert.match(html, /srcDoc="&lt;button&gt;Show details/)
  assert.doesNotMatch(html, /<pre><iframe/)
})
